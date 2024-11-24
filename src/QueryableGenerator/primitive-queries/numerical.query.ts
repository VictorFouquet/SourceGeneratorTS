import { BaseQuery } from "./base.query";

export class NumericalQuery<T extends number | Date> extends BaseQuery<T> {
    gt (value: T): this { this._query.gt  = value; return this };
    gte(value: T): this { this._query.gte = value; return this };
    lt (value: T): this { this._query.lt  = value; return this };
    lte(value: T): this { this._query.lte = value; return this };
}
