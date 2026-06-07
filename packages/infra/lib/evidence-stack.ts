/**
 * 成果・証跡管理システムの AWS インフラ（CDK 雛形）。
 * ローカル(LocalStack)と同じ構造を本番 AWS に展開する。プラン「移植性の原則」。
 *
 * 注意: これは雛形（MVP では未デプロイ）。デプロイ前に Lambda バンドルや
 * CORS 許可オリジン、Cognito ドメイン等を環境に合わせて確定すること。
 */
import * as path from 'node:path';
import {
  Stack,
  type StackProps,
  Duration,
  RemovalPolicy,
  CfnOutput,
  aws_dynamodb as dynamodb,
  aws_s3 as s3,
  aws_lambda as lambda,
  aws_lambda_nodejs as nodejs,
  aws_cognito as cognito,
  aws_events as events,
  aws_events_targets as targets,
  aws_apigatewayv2 as apigwv2,
  aws_apigatewayv2_integrations as integrations,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as origins,
  aws_s3_deployment as s3deploy,
} from 'aws-cdk-lib';
import type { Construct } from 'constructs';

export interface EvidenceStackProps extends StackProps {
  fiscalYearTableName: string;
  bucketName?: string;
}

const API_ENTRY = path.join(__dirname, '../../../apps/api/src/lambda.ts');
const AUDIT_ENTRY = path.join(__dirname, '../../../apps/api/src/lambda-audit.ts');
/** フロント配信用のビルド成果物（`pnpm --filter @evidence/web build` で生成） */
const WEB_DIST = path.join(__dirname, '../../../apps/web/dist');

export class EvidenceStack extends Stack {
  constructor(scope: Construct, id: string, props: EvidenceStackProps) {
    super(scope, id, props);

    // ── DynamoDB 単一テーブル（pk/sk + GSI1/2/3）──────────────
    const table = new dynamodb.Table(this, 'Table', {
      tableName: props.fiscalYearTableName,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: RemovalPolicy.RETAIN, // 台帳のため誤削除を防ぐ
    });
    for (const i of ['gsi1', 'gsi2', 'gsi3']) {
      table.addGlobalSecondaryIndex({
        indexName: i,
        partitionKey: { name: `${i}pk`, type: dynamodb.AttributeType.STRING },
        sortKey: { name: `${i}sk`, type: dynamodb.AttributeType.STRING },
        projectionType: dynamodb.ProjectionType.ALL,
      });
    }

    // ── S3（§14.3 セキュリティ設定）────────────────────────────
    const bucket = new s3.Bucket(this, 'EvidenceBucket', {
      ...(props.bucketName ? { bucketName: props.bucketName } : {}),
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
      cors: [
        {
          // 本番では許可オリジンを CloudFront ドメインに絞る
          allowedOrigins: ['*'],
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [{ noncurrentVersionExpiration: Duration.days(365) }],
    });

    // ── Cognito（認証。本番では MockAuth から差し替え）──────────
    const userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      removalPolicy: RemovalPolicy.RETAIN,
    });
    const userPoolClient = userPool.addClient('WebClient', {
      authFlows: { userSrp: true },
    });

    // ── API Lambda（Hono / 同一コードを Lambda 化）──────────────
    const commonEnv = {
      DDB_TABLE_NAME: table.tableName,
      S3_BUCKET: bucket.bucketName,
      AUTH_PROVIDER: 'cognito',
      COGNITO_USER_POOL_ID: userPool.userPoolId,
      COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
      AWS_REGION_OVERRIDE: this.region,
    };

    const apiFn = new nodejs.NodejsFunction(this, 'ApiFn', {
      entry: API_ENTRY,
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      bundling: { format: nodejs.OutputFormat.ESM, target: 'node22' },
    });
    table.grantReadWriteData(apiFn);
    bucket.grantReadWrite(apiFn);

    // HTTP API（API Gateway）→ Lambda 統合
    const httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      corsPreflight: {
        allowOrigins: ['*'], // 本番は CloudFront ドメインに限定
        allowMethods: [apigwv2.CorsHttpMethod.ANY],
        allowHeaders: ['authorization', 'content-type'],
      },
    });
    httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [apigwv2.HttpMethod.ANY],
      integration: new integrations.HttpLambdaIntegration('ApiIntegration', apiFn),
    });

    // ── 監査Agent Lambda + EventBridge 夜間スケジュール（§15.1）──
    const auditFn = new nodejs.NodejsFunction(this, 'AuditFn', {
      entry: AUDIT_ENTRY,
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: Duration.minutes(15),
      memorySize: 1024,
      environment: commonEnv,
      bundling: { format: nodejs.OutputFormat.ESM, target: 'node22' },
    });
    table.grantReadWriteData(auditFn);
    bucket.grantRead(auditFn);

    new events.Rule(this, 'NightlyAudit', {
      // 毎日 02:00 JST = 17:00 UTC
      schedule: events.Schedule.cron({ minute: '0', hour: '17' }),
      targets: [new targets.LambdaFunction(auditFn)],
    });

    // ── フロント配信（S3 + CloudFront）────────────────────────
    // SPA を非公開 S3 に置き、CloudFront(OAC) 経由で HTTPS 配信する。
    // クライアントサイドルーティングのため 403/404 は index.html に返す。
    const webBucket = new s3.Bucket(this, 'WebBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const distribution = new cloudfront.Distribution(this, 'WebDist', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(webBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
    });

    // `pnpm --filter @evidence/web build` 済みの dist を配置し、配信時にキャッシュ無効化。
    new s3deploy.BucketDeployment(this, 'WebDeploy', {
      sources: [s3deploy.Source.asset(WEB_DIST)],
      destinationBucket: webBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // ── 出力 ───────────────────────────────────────────────────
    new CfnOutput(this, 'WebUrl', { value: `https://${distribution.distributionDomainName}` });
    new CfnOutput(this, 'ApiUrl', { value: httpApi.apiEndpoint });
    new CfnOutput(this, 'TableName', { value: table.tableName });
    new CfnOutput(this, 'BucketName', { value: bucket.bucketName });
    new CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
  }
}
