import { Todo } from "../entities/todo.entity";
import { User } from "../entities/user.entity";
import { UserBuilder } from "./user.builder";
export class TodoBuilder {
  private target: Todo = {
    id: 0,
    creator: {} as unknown as User
  };

  constructor(creator?: User) {
    const _creator = creator ?? new UserBuilder(this.target).build();
    this.target.creator = _creator;
  }

  withId(value: number): this {
    this.target.id = value;
    return this;
  }

  withCreator(callback: (builder: UserBuilder) => User): this {
    this.target.creator = callback(new UserBuilder(this.target));

    return this;
  }

  build(): Todo {
    return this.target;
  }
}
