import { BaseListQuery } from "./base-list.query";
import { NumericalQuery } from "./numerical.query";

export class NumericalListQuery<T extends number | Date> extends BaseListQuery<T> {
    all(callback: (q: NumericalQuery<T>) => NumericalQuery<T>): this {
        this._query.all = callback(new NumericalQuery<T>()).getQuery();
        return this;
    }
    none(callback: (q: NumericalQuery<T>) => NumericalQuery<T>): this {
        this._query.none = callback(new NumericalQuery<T>()).getQuery();
        return this;
    }
    some(callback: (q: NumericalQuery<T>) => NumericalQuery<T>): this {
        this._query.some = callback(new NumericalQuery<T>()).getQuery();
        return this;
    }
}
