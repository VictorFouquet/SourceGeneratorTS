import { Todo } from "./todo.entity";

export interface User {
    id: number,
    name: string,
    todos: Todo[]
}
