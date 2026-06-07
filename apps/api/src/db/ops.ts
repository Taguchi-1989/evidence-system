/**
 * 単一テーブルへの汎用 CRUD/クエリ。設定 STORAGE_DRIVER に応じて
 * DynamoDB（aws）か インメモリ/ファイル（local）に振り分ける。
 * 各リポジトリはこのモジュールにのみ依存する（ドライバを意識しない）。
 */
import { config } from '../config.js';
import * as dynamo from './dynamo-store.js';
import * as memory from './memory-store.js';

const impl = config.storage.driver === 'local' ? memory : dynamo;

export const putItem = impl.putItem;
export const getItem = impl.getItem;
export const deleteItem = impl.deleteItem;
export const query = impl.query;
export const updateAttributes = impl.updateAttributes;

export type { StoredItem } from './store-util.js';
