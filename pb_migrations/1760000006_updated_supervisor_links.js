/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("supervisor_links");

  // Add created system field
  collection.fields.add(new Field({
    "hidden": false,
    "id": "autodate_sl_created",
    "name": "created",
    "onCreate": true,
    "onUpdate": false,
    "presentable": false,
    "system": true,
    "type": "autodate"
  }));

  // Add updated system field
  collection.fields.add(new Field({
    "hidden": false,
    "id": "autodate_sl_updated",
    "name": "updated",
    "onCreate": true,
    "onUpdate": true,
    "presentable": false,
    "system": true,
    "type": "autodate"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("supervisor_links");
  collection.fields.removeById("autodate_sl_created");
  collection.fields.removeById("autodate_sl_updated");
  return app.save(collection);
});
