import { BaseQuery } from "./base.query";

export class BooleanQuery extends BaseQuery<boolean> {
    not(value: boolean): void { this._query.not = value; }
}
