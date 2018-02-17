import Table from "./Table"

export default class Database {
  tables = {}

  getTable(tableName) {
    if (!(tableName in this.tables)) {
      this.tables[tableName] = new Table(tableName)
    }
    return this.tables[tableName]
  }
}
