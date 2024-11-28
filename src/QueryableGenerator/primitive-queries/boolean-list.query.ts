import { BaseListQuery } from "./base-list.query";
import { BooleanQuery } from "./boolean.query";

export class BooleanListQuery extends BaseListQuery<boolean> {
    all(callback: (q: BooleanQuery) => BooleanQuery): this {
        this._query.all = callback(new BooleanQuery()).getQuery();
        return this;
    }
    none(callback: (q: BooleanQuery) => BooleanQuery): this {
        this._query.none = callback(new BooleanQuery()).getQuery();
        return this;
    }
    some(callback: (q: BooleanQuery) => BooleanQuery): this {
        this._query.some = callback(new BooleanQuery()).getQuery();
        return this;
    }
}
