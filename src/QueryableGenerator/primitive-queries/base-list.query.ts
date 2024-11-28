import { BaseQuery } from "./base.query";

export abstract class BaseListQuery<T extends number | string | boolean | Date> {
    protected _query: Record<string, Record<string, T>> = {};

    abstract all(callback: (q: BaseQuery<T>) => BaseQuery<T>): this;
    abstract none(callback: (q: BaseQuery<T>) => BaseQuery<T>): this;
    abstract some(callback: (q: BaseQuery<T>) => BaseQuery<T>): this;

    getQuery() {
        return this._query;
    }
}
