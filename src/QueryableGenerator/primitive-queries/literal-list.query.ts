import { BaseListQuery } from "./base-list.query";
import { LiteralQuery } from "./literal.query";

export class LiteralListQuery extends BaseListQuery<string> {
    all(callback: (q: LiteralQuery) => LiteralQuery): this {
        this._query.all = callback(new LiteralQuery()).getQuery();
        return this;
    }
    none(callback: (q: LiteralQuery) => LiteralQuery): this {
        this._query.none = callback(new LiteralQuery()).getQuery();
        return this;
    }
    some(callback: (q: LiteralQuery) => LiteralQuery): this {
        this._query.some = callback(new LiteralQuery()).getQuery();
        return this;
    }
}
