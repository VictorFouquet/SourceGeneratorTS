import { Todo } from "./todo.entity";

export interface User {
    id: number,
    name: string,
    isAdmin: boolean,
    creationDate: Date,
    todo: Todo
}
