/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("procedures");

  collection.fields.add(new Field({
    "hidden": false,
    "id": "bool_proc_featured",
    "name": "featured",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("procedures");
  collection.fields.removeById("bool_proc_featured");
  return app.save(collection);
});
