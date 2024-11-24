import { User } from "../entities/user.entity";
import { Todo } from "../entities/todo.entity";
import { TodoBuilder } from "./todo.builder";
export class UserBuilder {
    private target: User = {
      id: 0,
      todo: {} as unknown as Todo
    };
  
    constructor(todo?: Todo) {
        const _todo = todo ?? new TodoBuilder(this.target).build();
        this.target.todo = _todo;
    }
  
    withId(value: number): this {
      this.target.id = value;
      return this;
    }
  
    withTodo(callback: (builder: TodoBuilder) => Todo): this {
        this.target.todo = callback(new TodoBuilder(this.target));

        return this;
    }
  
    build(): User {
      return this.target;
    }
  }

console.log(
    new UserBuilder()
        .withId(1)
        .withTodo(t => t
            .withId(2)
            .withCreator(
                c => c
                .withId(3)
                .withTodo(tt => tt
                    .withId(4)
                    .withCreator(cc => cc
                        .withId(5)
                        .withTodo(ttt => ttt
                            .withId(6)
                            .build()
                        )
                        .build()
                    )
                    .build()
                )
                .build()
            )
            .build()
        )
        .build()
);
