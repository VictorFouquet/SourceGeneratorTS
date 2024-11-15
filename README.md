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
export interface User {
    id: number,
    name: string,
    isAdmin: boolean,
    creationDate: Date
}
```
The builder generator will create :

```typescript
// src/BuilderGenerator/builders/user.builder.ts
import { User } from "../entities/user.entity";
export class UserBuilder {
    id: number = 0;
    name: string = "";
    isAdmin: boolean = false;
    creationDate: Date = new Date();
    withId = (value: number): this => {
        this.id = value;
        return this;
    };
    withName = (value: string): this => {
        this.name = value;
        return this;
    };
    withIsAdmin = (value: boolean): this => {
        this.isAdmin = value;
        return this;
    };
    withCreationDate = (value: Date): this => {
        this.creationDate = value;
        return this;
    };
    build = (): User => {
        return {
            id: this.id,
            name: this.name,
            isAdmin: this.isAdmin,
            creationDate: this.creationDate
        };
    };
    __className: string = "User";
}
```
**Running the script**

After installing dependencies, execute with:

```bash
npm run generate-builder
```

Generated files will be placed in `src/BuilderGenerator/builders`.
