#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { EvidenceStack } from '../lib/evidence-stack';

const app = new cdk.App();

new EvidenceStack(app, 'EvidenceSystem', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'ap-northeast-1',
  },
  fiscalYearTableName: 'evidence-system',
  bucketName: process.env.EVIDENCE_BUCKET, // 省略時は CDK が一意名を採番
});
