/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    // Resident creates own lines only (hooks enforce resident = auth.id)
    "createRule": "@request.auth.role = 'resident'",
    // Resident deletes own draft only
    "deleteRule": "@request.auth.role = 'resident' && resident = @request.auth.id && status = 'draft'",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "cascadeDelete": false,
        "collectionId": "_pb_users_auth_",
        "hidden": false,
        "id": "rel_le_resident",
        "maxSelect": 1,
        "minSelect": 1,
        "name": "resident",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_logbook_procs",
        "hidden": false,
        "id": "rel_le_procedure",
        "maxSelect": 1,
        "minSelect": 1,
        "name": "procedure",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_le_date",
        "max": 0,
        "min": 0,
        "name": "date",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "number_le_count",
        "max": null,
        "min": 1,
        "name": "count",
        "onlyInt": true,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "select_le_complexity",
        "maxSelect": 1,
        "name": "complexity",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": ["simple", "complex"]
      },
      {
        "hidden": false,
        "id": "number_le_res_level",
        "max": 5,
        "min": 1,
        "name": "resident_level",
        "onlyInt": true,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_le_comment",
        "max": 0,
        "min": 0,
        "name": "comment",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "select_le_status",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": ["draft", "submitted", "approved", "rejected"]
      },
      {
        "cascadeDelete": false,
        "collectionId": "_pb_users_auth_",
        "hidden": false,
        "id": "rel_le_supervisor",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "supervisor",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_le_submitted_at",
        "max": 0,
        "min": 0,
        "name": "submitted_at",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "number_le_sup_level",
        "max": 5,
        "min": 1,
        "name": "supervisor_level",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_le_remark",
        "max": 0,
        "min": 0,
        "name": "remark",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_le_reviewed_at",
        "max": 0,
        "min": 0,
        "name": "reviewed_at",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_le_iso_week",
        "max": 0,
        "min": 0,
        "name": "iso_week",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      }
    ],
    "id": "pbc_logbook_entr",
    "indexes": [],
    // Resident sees own; supervisor sees assigned; admin sees all
    "listRule": "@request.auth.role = 'admin' || resident = @request.auth.id || supervisor = @request.auth.id",
    "name": "logbook_entries",
    "system": false,
    "type": "base",
    // Resident edits own draft/rejected; supervisor edits submitted assigned; admin edits all
    "updateRule": "@request.auth.role = 'admin' || (resident = @request.auth.id && (status = 'draft' || status = 'rejected')) || (@request.auth.role = 'supervisor' && supervisor = @request.auth.id && status = 'submitted')",
    "viewRule": "@request.auth.role = 'admin' || resident = @request.auth.id || supervisor = @request.auth.id"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_logbook_entr");
  return app.delete(collection);
});
