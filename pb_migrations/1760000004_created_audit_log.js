/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    // Only hooks write audit_log; no UI create
    "createRule": null,
    "deleteRule": null,
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
        "collectionId": "pbc_logbook_entr",
        "hidden": false,
        "id": "rel_al_entry",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "entry",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": false,
        "collectionId": "_pb_users_auth_",
        "hidden": false,
        "id": "rel_al_actor",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "actor",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_al_action",
        "max": 0,
        "min": 0,
        "name": "action",
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
        "id": "text_al_before",
        "max": 0,
        "min": 0,
        "name": "before",
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
        "id": "text_al_after",
        "max": 0,
        "min": 0,
        "name": "after",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "autodate_al_at",
        "name": "at",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_logbook_audit",
    "indexes": [],
    // Admin reads all; non-admin reads nothing (write-only from hooks)
    "listRule": "@request.auth.role = 'admin'",
    "name": "audit_log",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": "@request.auth.role = 'admin'"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_logbook_audit");
  return app.delete(collection);
});
