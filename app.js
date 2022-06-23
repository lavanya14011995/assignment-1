const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const format = require("date-fns/format");
const isValid = require("date-fns/isValid");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "todoApplication.db");
let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server running at http://localhost:3000")
    );
  } catch (e) {
    console.log(`DB error:${e.message}`);
  }
};
initializeDBAndServer();
const convertDBObjectToResponseObj = (obj) => {
  return {
    id: obj.id,
    todo: obj.todo,
    priority: obj.priority,
    status: obj.status,
    category: obj.category,
    dueDate: obj.due_date,
  };
};
const validStatus = (request, response, next) => {
  const { status } = request.query;
  if (status !== undefined) {
    if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
      next();
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  } else {
    next();
  }
};
const validPriority = (request, response, next) => {
  const { priority } = request.query;
  if (priority !== undefined) {
    if (priority === "LOW" || priority === "MEDIUM" || priority === "HIGH") {
      next();
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  } else {
    next();
  }
};
const validCategory = (request, response, next) => {
  const { category } = request.query;
  if (category !== undefined) {
    if (category === "WORK" || category === "HOME" || category === "LEARNING") {
      next();
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
    }
  } else {
    next();
  }
};
const validDate = (request, response, next) => {
  try {
    const { date } = request.query;
    if (date !== undefined) {
      formattedDate = format(new Date(date), "yyyy-MM-dd");
      isValidDate = isValid(new Date(formattedDate));
      if (isValidDate === true) {
        request.date = formattedDate;
        next();
      } else {
        response.status(400);
        response.send("Invalid Due Date");
      }
    } else {
      next();
    }
  } catch (e) {
    response.status(400);
    response.send("Invalid Due Date");
  }
};
const isStatusValidFun = (status) => {
  if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
    return true;
  } else {
    return false;
  }
};
const isPriorityValidFun = (priority) => {
  if (priority === "LOW" || priority === "MEDIUM" || priority === "HIGH") {
    return true;
  } else {
    return false;
  }
};
const isCategoryValidFun = (category) => {
  if (category === "WORK" || category === "HOME" || category === "LEARNING") {
    return true;
  } else {
    return false;
  }
};
const isDueDateValidFun = (dueDate) => {
  try {
    let formattedDate = format(new Date(dueDate), "yyyy-MM-dd");
    if (isValid(new Date(formattedDate))) {
      return true;
    }
  } catch {
    return false;
  }
};
app.get(
  "/todos/",
  validStatus,
  validPriority,
  validCategory,
  async (request, response) => {
    const { status, priority, category, search_q = "" } = request.query;
    let getTodoListQuery;
    if (status !== undefined && priority !== undefined) {
      getTodoListQuery = `
            SELECT * FROM todo
            WHERE status='${status}' AND
            priority='${priority}';
        `;
    } else if (status !== undefined) {
      getTodoListQuery = `
            SELECT * FROM todo
            WHERE status='${status}';
        `;
    } else if (priority !== undefined) {
      getTodoListQuery = `
            SELECT * FROM todo
            WHERE priority='${priority}';
        `;
    } else if (category !== undefined && status !== undefined) {
      getTodoListQuery = `
            SELECT * FROM todo
            WHERE status='${status}' AND
                  category='${category}';
        `;
    } else if (category !== undefined) {
      getTodoListQuery = `
            SELECT * FROM todo
            WHERE category='${category}';
        `;
    } else if (category !== undefined && priority !== undefined) {
      getTodoListQuery = `
            SELECT * FROM todo
            WHERE category='${category}' AND
                  priority='${priority}';
        `;
    } else {
      getTodoListQuery = `
            SELECT * FROM todo
            WHERE todo LIKE '%${search_q}%';
        `;
    }
    console.log(getTodoListQuery);
    const todoList = await db.all(getTodoListQuery);
    response.send(todoList.map(convertDBObjectToResponseObj));
  }
);
app.get("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
        SELECT * FROM todo
        WHERE
            id=${todoId};
    `;
  const todoItem = await db.get(getTodoQuery);
  response.send(convertDBObjectToResponseObj(todoItem));
});
app.get("/agenda/", validDate, async (request, response) => {
  const { date } = request;
  //console.log(date);
  const getTodoListDueDateQuery = `
        SELECT * FROM todo
        WHERE 
            due_date='${date}';
    `;
  console.log(getTodoListDueDateQuery);
  const todoList = await db.all(getTodoListDueDateQuery);
  response.send(todoList.map(convertDBObjectToResponseObj));
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  if (!isStatusValidFun(status)) {
    response.status(400);
    response.send("Invalid Todo Status");
  }
  if (!isPriorityValidFun(priority)) {
    response.status(400);
    response.send("Invalid Todo Priority");
  }
  if (!isCategoryValidFun(category)) {
    response.status(400);
    response.send("Invalid Todo Category");
  }
  if (!isDueDateValidFun(dueDate)) {
    response.status(400);
    response.send("Invalid Due Date");
  }
  if (
    isStatusValidFun(status) &&
    isPriorityValidFun(priority) &&
    isCategoryValidFun(category) &&
    isDueDateValidFun(dueDate)
  ) {
    const createTodoQuery = `
        INSERT INTO 
        todo (id,todo,category,priority,status,due_date)
        VALUES (${id},'${todo}','${category}','${priority}',
        '${status}','${dueDate}');
    `;
    await db.run(createTodoQuery);
    response.send("Todo Successfully Added");
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const requestBody = request.body;
  let isUpdatedValueValid;
  let updatedColumn;
  if (requestBody.status !== undefined) {
    updatedColumn = "Status";
    if (isStatusValidFun(requestBody.status)) {
      isUpdatedValueValid = true;
    } else {
      isUpdatedValueValid = false;
      response.status(400);
      response.send("Invalid Todo Status");
    }
  } else if (requestBody.priority !== undefined) {
    updatedColumn = "Priority";
    if (isPriorityValidFun(requestBody.priority)) {
      isUpdatedValueValid = true;
    } else {
      isUpdatedValueValid = false;
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  } else if (requestBody.category !== undefined) {
    updatedColumn = "Category";
    if (isCategoryValidFun(requestBody.category)) {
      isUpdatedValueValid = true;
    } else {
      isUpdatedValueValid = false;
      response.status(400);
      response.send("Invalid Todo Category");
    }
  } else if (requestBody.todo !== undefined) {
    updatedColumn = "Todo";
    isUpdatedValueValid = true;
  } else if (requestBody.dueDate !== undefined) {
    updatedColumn = "Due Date";
    if (isDueDateValidFun(requestBody.dueDate)) {
      isUpdatedValueValid = true;
    } else {
      isUpdatedValueValid = false;
      response.status(400);
      response.send("Invalid Due Date");
    }
  }

  let previousTodoQuery = `
        SELECT * FROM todo
        WHERE id=${todoId};
    `;
  const previousTodo = await db.get(previousTodoQuery);

  const {
    todo = previousTodo.todo,
    status = previousTodo.status,
    priority = previousTodo.priority,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request.body;
  if (isUpdatedValueValid) {
    const updateTodoQuery = `
        UPDATE todo
        SET
            todo='${todo}',
            status='${status}',
            priority='${priority}',
            category='${category}',
            due_date='${dueDate}'
        WHERE 
            id=${todoId};
    `;
    await db.run(updateTodoQuery);
    response.send(`${updatedColumn} Updated`);
  }
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
        DELETE FROM todo
        WHERE 
            id=${todoId};
    `;
  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});
module.exports = app;
