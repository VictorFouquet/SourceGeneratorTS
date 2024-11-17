# Source Generator TS

Sandbox project to play and experiment with typescript's  compiler [factory](https://github.com/microsoft/TypeScript/tree/main/src/compiler/factory) API.

## Builder Generator

Source generator script to dynamically create builders out of interfaces.

The source generator reads and parses entity files located in the `src/BuilderGenerator/entities` folder.

It uses the extracted data to create classes, usable as a template populated with :
- predefined default values for each member of the entity
- `with[Member]` chainable methods for setting the template instance's values if needed
- `build` method, returning an object that implements the entity interface
- `__className` member, with value being the name of the entity as a string

Import statements referencing the mapped entity are also generated.

**Example**

From the following entity :

```typescript
// src/BuilderGenerator/entities/user.entity.ts
import { Todo } from "./todo.entity";

export interface User {
    id: number,
    name: string,
    isAdmin: boolean,
    creationDate: Date,
    todo: Todo
}
```
The builder generator will create :

```typescript
// src/BuilderGenerator/builders/user.builder.ts
import { User } from "../entities/user.entity";
import { Todo } from "../entities/todo.entity";
import { TodoBuilder } from "./todo.builder";
export class UserBuilder {
    private id: number = 0;
    private name: string = "";
    private isAdmin: boolean = false;
    private creationDate: Date = new Date();
    private todo: Todo = new TodoBuilder().build();
    readonly withId = (value: number): this => {
        this.id = value;
        return this;
    };
    readonly withName = (value: string): this => {
        this.name = value;
        return this;
    };
    readonly withIsAdmin = (value: boolean): this => {
        this.isAdmin = value;
        return this;
    };
    readonly withCreationDate = (value: Date): this => {
        this.creationDate = value;
        return this;
    };
    readonly withTodo = (callback: (builder: TodoBuilder) => TodoBuilder): this => {
        this.todo = callback(new TodoBuilder()).build();
        return this;
    };
    readonly build = (): User => {
        return {
            id: this.id,
            name: this.name,
            isAdmin: this.isAdmin,
            creationDate: this.creationDate,
            todo: this.todo
        };
    };
    readonly __className: string = "User";
}
```
**Running the script**

After installing dependencies, execute with:

```bash
npm run generate-builder
```

Generated files will be placed in `src/BuilderGenerator/builders`.
