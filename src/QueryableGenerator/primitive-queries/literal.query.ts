import { BaseQuery } from "./base.query";

export class LiteralQuery extends BaseQuery<string> {
    contains  (value: string): this { this._query.contains   = value; return this; };
    endsWith  (value: string): this { this._query.endsWith   = value; return this; };
    like      (value: string): this { this._query.like       = value; return this; };
    startsWith(value: string): this { this._query.startsWith = value; return this; };
}
