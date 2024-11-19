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
export type Todo = {
    id: number;
    due: Date;
    tags: string[];
}

// src/BuilderGenerator/entities/user.entity.ts
import { Todo } from "./todo.entity";

export type User {
    id: number,
    name: string,
    todos: Todo[]
}
```
The generated UserBuilder will be :

```typescript
// src/BuilderGenerator/builders/user.builder.ts
import { User } from "../entities/user.entity";
import { Todo } from "../entities/todo.entity";
import { TodoBuilder } from "./todo.builder";
export class UserBuilder {
    private id: number = 0;
    private name: string = "";
    private todos: Todo[] = [new TodoBuilder().build()];
    readonly withId = (value: number): this => {
        this.id = value;
        return this;
    };
    readonly withName = (value: string): this => {
        this.name = value;
        return this;
    };
    readonly withTodos = (callback: (builder: TodoBuilder) => Todo[]): this => {
        this.todos = callback(new TodoBuilder());
        return this;
    };
    readonly build = (): User => {
        return {
            id: this.id,
            name: this.name,
            todos: this.todos
        };
    };
    readonly __className: string = "User";
}
```

Objects can then be built by chaining `with{Property}` methods, and finally calling the `build` method to retrieve the original entity typed instance.

All properties are given a predefined value, so direct calls to `build` method after builder instantiation will produce valid objects.

For relational objects fields, the `with{Property}` must be given a callback taking the target object builder as argument and returning a target object by calling `build` method on it.

*Note that circular reference will lead to infinite recursion when instantiating a builder*

```typescript
const user = new UserBuilder()
    .withId(42)
    .withName("Jean")
    .build();

const userWithTodos = new UserBuilder()
    .withTodos(
        todoBuilder => {
            return [
                todoBuilder.withId(1).build(),
                todoBuilder.withId(2).build(),
                todoBuilder.withId(3).build(),
            ]
        }
    );

const todo = new TodoBuilder()
    .withDue(new Date())
    .withTags([
        "SourceGenerator",
        "TypeScript"
    ]);
```
**Running the script**

After installing dependencies, execute with:

```bash
npm run generate-builder
```

Generated files will be placed in `src/BuilderGenerator/builders`.
