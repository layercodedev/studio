import { BaseDriver, ViewConfig } from "@/drivers/base-driver";

const CONFIG_TABLE_NAME = "_outerbase_view_config";

/**
 * Service for managing view configuration metadata stored in a hidden database table.
 * This allows storing display preferences (table vs board view, groupBy column, etc.)
 * that don't fit in the SQL view definition.
 */

/**
 * Ensures the _outerbase_view_config table exists in the database.
 * Creates it if it doesn't exist.
 */
export async function ensureConfigTableExists(
  driver: BaseDriver
): Promise<void> {
  const dialect = driver.getFlags().dialect;

  let createTableSql: string;

  switch (dialect) {
    case "postgres":
      createTableSql = `CREATE TABLE IF NOT EXISTS ${CONFIG_TABLE_NAME} (schema_name TEXT NOT NULL, view_name TEXT NOT NULL, config JSONB NOT NULL, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (schema_name, view_name))`;
      break;
    case "mysql":
    case "dolt":
      createTableSql = `CREATE TABLE IF NOT EXISTS ${CONFIG_TABLE_NAME} (schema_name VARCHAR(255) NOT NULL, view_name VARCHAR(255) NOT NULL, config JSON NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (schema_name, view_name))`;
      break;
    case "sqlite":
    default:
      createTableSql = `CREATE TABLE IF NOT EXISTS ${CONFIG_TABLE_NAME} (schema_name TEXT NOT NULL, view_name TEXT NOT NULL, config TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (schema_name, view_name))`;
      break;
  }

  await driver.query(createTableSql);
}

/**
 * Saves or updates the configuration for a view.
 */
export async function saveViewConfig(
  driver: BaseDriver,
  schemaName: string,
  viewName: string,
  config: ViewConfig
): Promise<void> {
  await ensureConfigTableExists(driver);

  const dialect = driver.getFlags().dialect;
  const configJson = JSON.stringify(config);

  let upsertSql: string;

  switch (dialect) {
    case "postgres":
      upsertSql = `INSERT INTO ${CONFIG_TABLE_NAME} (schema_name, view_name, config) VALUES (${driver.escapeValue(schemaName)}, ${driver.escapeValue(viewName)}, ${driver.escapeValue(configJson)}::jsonb) ON CONFLICT (schema_name, view_name) DO UPDATE SET config = ${driver.escapeValue(configJson)}::jsonb, updated_at = CURRENT_TIMESTAMP`;
      break;
    case "mysql":
    case "dolt":
      upsertSql = `INSERT INTO ${CONFIG_TABLE_NAME} (schema_name, view_name, config) VALUES (${driver.escapeValue(schemaName)}, ${driver.escapeValue(viewName)}, ${driver.escapeValue(configJson)}) ON DUPLICATE KEY UPDATE config = ${driver.escapeValue(configJson)}, updated_at = CURRENT_TIMESTAMP`;
      break;
    case "sqlite":
    default:
      upsertSql = `INSERT INTO ${CONFIG_TABLE_NAME} (schema_name, view_name, config, updated_at) VALUES (${driver.escapeValue(schemaName)}, ${driver.escapeValue(viewName)}, ${driver.escapeValue(configJson)}, CURRENT_TIMESTAMP) ON CONFLICT (schema_name, view_name) DO UPDATE SET config = ${driver.escapeValue(configJson)}, updated_at = CURRENT_TIMESTAMP`;
      break;
  }

  await driver.query(upsertSql);
}

/**
 * Loads the configuration for a view.
 * Returns null if no configuration exists.
 */
export async function loadViewConfig(
  driver: BaseDriver,
  schemaName: string,
  viewName: string
): Promise<ViewConfig | null> {
  try {
    // Try to select directly from the config table
    // If the table doesn't exist, the query will fail and we'll catch it
    const selectSql = `SELECT config FROM ${CONFIG_TABLE_NAME} WHERE schema_name = ${driver.escapeValue(schemaName)} AND view_name = ${driver.escapeValue(viewName)}`;

    const result = await driver.query(selectSql);

    if (result.rows.length === 0) {
      return null;
    }

    const configValue = result.rows[0].config;

    // Handle different storage formats
    if (typeof configValue === "string") {
      return JSON.parse(configValue) as ViewConfig;
    } else if (typeof configValue === "object") {
      // PostgreSQL JSONB returns an object directly
      return configValue as ViewConfig;
    }

    return null;
  } catch {
    // Table doesn't exist or query failed - this is expected if no config was saved
    return null;
  }
}

/**
 * Deletes the configuration for a view.
 */
export async function deleteViewConfig(
  driver: BaseDriver,
  schemaName: string,
  viewName: string
): Promise<void> {
  try {
    const deleteSql = `DELETE FROM ${CONFIG_TABLE_NAME} WHERE schema_name = ${driver.escapeValue(schemaName)} AND view_name = ${driver.escapeValue(viewName)}`;
    await driver.query(deleteSql);
  } catch {
    // Table doesn't exist, nothing to delete
  }
}

/**
 * Renames the configuration when a view is renamed.
 */
export async function renameViewConfig(
  driver: BaseDriver,
  schemaName: string,
  oldViewName: string,
  newViewName: string
): Promise<void> {
  try {
    const updateSql = `UPDATE ${CONFIG_TABLE_NAME} SET view_name = ${driver.escapeValue(newViewName)}, updated_at = CURRENT_TIMESTAMP WHERE schema_name = ${driver.escapeValue(schemaName)} AND view_name = ${driver.escapeValue(oldViewName)}`;
    await driver.query(updateSql);
  } catch {
    // Table doesn't exist or no config to rename
  }
}
