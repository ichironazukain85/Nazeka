(function () {
  "use strict";

  const STORAGE_KEY = "nazeka-todos";

  let todos = loadTodos();
  let currentFilter = "all";

  const form = document.getElementById("todo-form");
  const input = document.getElementById("todo-input");
  const list = document.getElementById("todo-list");
  const countEl = document.getElementById("todo-count");
  const clearBtn = document.getElementById("clear-completed");
  const filterBtns = document.querySelectorAll(".filter-btn");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    todos.push({ id: Date.now(), text: text, completed: false });
    input.value = "";
    save();
    render();
  });

  clearBtn.addEventListener("click", function () {
    todos = todos.filter(function (t) { return !t.completed; });
    save();
    render();
  });

  filterBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      currentFilter = btn.dataset.filter;
      filterBtns.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      render();
    });
  });

  function loadTodos() {
    try {
      var data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }

  function render() {
    var filtered = todos.filter(function (t) {
      if (currentFilter === "active") return !t.completed;
      if (currentFilter === "completed") return t.completed;
      return true;
    });

    list.innerHTML = "";

    filtered.forEach(function (todo) {
      var li = document.createElement("li");
      if (todo.completed) li.classList.add("completed");

      var checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = todo.completed;
      checkbox.addEventListener("change", function () {
        todo.completed = checkbox.checked;
        save();
        render();
      });

      var span = document.createElement("span");
      span.className = "todo-text";
      span.textContent = todo.text;

      var delBtn = document.createElement("button");
      delBtn.className = "delete-btn";
      delBtn.textContent = "\u00d7";
      delBtn.addEventListener("click", function () {
        todos = todos.filter(function (t) { return t.id !== todo.id; });
        save();
        render();
      });

      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(delBtn);
      list.appendChild(li);
    });

    var activeCount = todos.filter(function (t) { return !t.completed; }).length;
    countEl.textContent = activeCount + " 件のタスク";
  }

  render();
})();
