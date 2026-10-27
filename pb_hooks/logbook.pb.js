// Logbook module hooks — all logic inlined per-callback (Goja ES5 isolation)

// ── logbook_entries: create ──────────────────────────────────────────
onRecordCreateRequest(function(e) {
  if (e.collection.name !== 'logbook_entries') { e.next(); return; }

  // Enforce: resident can only create for themselves
  var auth = e.auth;
  if (!auth) { throw new BadRequestError("Authentication required"); }
  var role = '';
  try { role = String(auth.get('role') || ''); } catch(err) {}

  if (role !== 'resident') {
    throw new ForbiddenError("Only residents can create logbook entries");
  }

  // Always force resident = auth.id (prevents spoofing, works even if client omits the field)
  e.record.set('resident', auth.id);

  // Enforce status = draft on create
  e.record.set('status', 'draft');

  // Clear supervisor fields on create
  e.record.set('supervisor', '');
  e.record.set('submitted_at', '');
  e.record.set('supervisor_level', null);
  e.record.set('remark', '');
  e.record.set('reviewed_at', '');

  // Set iso_week from date
  var dateStr = String(e.record.get('date') || '');
  if (dateStr) {
    try {
      var d = new Date(dateStr);
      var jan4 = new Date(d.getFullYear(), 0, 4);
      var dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
      var weekNum = Math.ceil((dayOfYear + (jan4.getDay() || 7)) / 7);
      var yr = d.getFullYear();
      if (weekNum > 52) {
        var dec28 = new Date(yr, 11, 28);
        if (d > dec28) { yr = yr + 1; weekNum = 1; }
      }
      e.record.set('iso_week', yr + '-W' + (weekNum < 10 ? '0' + weekNum : String(weekNum)));
    } catch(werr) {}
  }

  e.next();

  // Write audit_log after save
  try {
    var auditCol = $app.findCollectionByNameOrId('audit_log');
    var log = new Record(auditCol);
    log.set('entry', e.record.id);
    log.set('actor', auth.id);
    log.set('action', 'created');
    log.set('before', '{}');
    log.set('after', JSON.stringify({status:'draft', resident_level: e.record.get('resident_level')}));
    $app.save(log);
  } catch(aerr) { $app.logger().warn('audit_log create failed: ' + String(aerr)); }

}, 'logbook_entries');


// ── logbook_entries: update ──────────────────────────────────────────
onRecordUpdateRequest(function(e) {
  if (e.collection.name !== 'logbook_entries') { e.next(); return; }

  var auth = e.auth;
  if (!auth) { throw new BadRequestError("Authentication required"); }
  var role = '';
  try { role = String(auth.get('role') || ''); } catch(err) {}

  var oldStatus = String(e.record.original().get('status') || '');
  var newStatus = String(e.record.get('status') || oldStatus);

  // Approved lines are immutable (admin can override)
  if (oldStatus === 'approved' && role !== 'admin') {
    throw new ForbiddenError("Approved entries cannot be edited");
  }

  if (role === 'resident') {
    // Resident: only own draft/rejected lines
    var entryResident = String(e.record.original().get('resident') || '');
    if (entryResident !== auth.id) {
      throw new ForbiddenError("You can only edit your own entries");
    }
    if (oldStatus !== 'draft' && oldStatus !== 'rejected') {
      throw new ForbiddenError("You can only edit draft or rejected entries");
    }
    // Resident cannot touch supervisor review fields
    var forbiddenFields = ['supervisor', 'supervisor_level', 'remark', 'reviewed_at'];
    for (var i = 0; i < forbiddenFields.length; i++) {
      var f = forbiddenFields[i];
      var origVal = String(e.record.original().get(f) || '');
      var newVal  = String(e.record.get(f) || '');
      if (origVal !== newVal) {
        throw new ForbiddenError("Residents cannot set field: " + f);
      }
    }
    // Resident can keep status unchanged (draft or rejected) or change to submitted
    if (newStatus !== oldStatus && newStatus !== 'submitted') {
      throw new ForbiddenError("Residents can only set status to submitted");
    }
    // On submit: look up supervisor from supervisor_links
    if (newStatus === 'submitted' && oldStatus !== 'submitted') {
      var supervisorId = '';
      try {
        var links = $app.findRecordsByFilter('supervisor_links', "resident = '" + auth.id + "'", '', 1, 0);
        if (links.length > 0) {
          supervisorId = String(links[0].get('supervisor') || '');
        }
      } catch(lerr) { $app.logger().warn('supervisor_links lookup failed: ' + String(lerr)); }
      e.record.set('supervisor', supervisorId);
      e.record.set('submitted_at', new Date().toISOString().slice(0, 10));
    }

  } else if (role === 'supervisor') {
    // Supervisor: only submitted lines assigned to them
    var entrySupervisor = String(e.record.original().get('supervisor') || '');
    if (entrySupervisor !== auth.id) {
      throw new ForbiddenError("This entry is not assigned to you");
    }
    if (oldStatus !== 'submitted') {
      throw new ForbiddenError("You can only review submitted entries");
    }
    // Supervisor can only change status/supervisor_level/remark/reviewed_at
    var supervisorAllowed = {status:1, supervisor_level:1, remark:1, reviewed_at:1};
    var residentFields = ['resident','procedure','date','count','complexity','resident_level','comment','submitted_at','iso_week'];
    for (var ri = 0; ri < residentFields.length; ri++) {
      var rf = residentFields[ri];
      var origRV = String(e.record.original().get(rf) || '');
      var newRV  = String(e.record.get(rf) || '');
      if (origRV !== newRV) {
        throw new ForbiddenError("Supervisors cannot change field: " + rf);
      }
    }
    // Only approved or rejected
    if (newStatus !== 'approved' && newStatus !== 'rejected') {
      throw new ForbiddenError("Supervisors can only approve or reject");
    }
    // Reject requires remark
    if (newStatus === 'rejected') {
      var remark = String(e.record.get('remark') || '').trim();
      if (!remark) {
        throw new BadRequestError("A remark is required when rejecting an entry");
      }
    }
    // Set reviewed_at
    e.record.set('reviewed_at', new Date().toISOString().slice(0, 10));

  }
  // admin: no restrictions beyond approved guard above

  var beforeSnap = JSON.stringify({status: oldStatus, resident_level: e.record.original().get('resident_level'), supervisor_level: e.record.original().get('supervisor_level')});
  var afterSnap  = JSON.stringify({status: newStatus, resident_level: e.record.get('resident_level'), supervisor_level: e.record.get('supervisor_level')});

  e.next();

  // Write audit_log if status or level changed
  var statusChanged = (oldStatus !== newStatus);
  var levelChanged  = (String(e.record.original().get('supervisor_level') || '') !== String(e.record.get('supervisor_level') || ''));
  if (statusChanged || levelChanged) {
    try {
      var auditCol2 = $app.findCollectionByNameOrId('audit_log');
      var log2 = new Record(auditCol2);
      log2.set('entry', e.record.id);
      log2.set('actor', auth.id);
      log2.set('action', statusChanged ? ('status:' + oldStatus + '->' + newStatus) : 'level_change');
      log2.set('before', beforeSnap);
      log2.set('after', afterSnap);
      $app.save(log2);
    } catch(aerr2) { $app.logger().warn('audit_log update failed: ' + String(aerr2)); }
  }

}, 'logbook_entries');


// ── logbook_entries: delete ──────────────────────────────────────────
onRecordDeleteRequest(function(e) {
  if (e.collection.name !== 'logbook_entries') { e.next(); return; }

  var auth = e.auth;
  if (!auth) { throw new BadRequestError("Authentication required"); }
  var role = '';
  try { role = String(auth.get('role') || ''); } catch(err) {}

  if (role === 'admin') { e.next(); return; }

  var entryResident = String(e.record.get('resident') || '');
  var entryStatus   = String(e.record.get('status') || '');

  if (role !== 'resident' || entryResident !== auth.id || entryStatus !== 'draft') {
    throw new ForbiddenError("Only residents can delete their own draft entries");
  }

  e.next();
}, 'logbook_entries');


// ── procedures: delete guard ─────────────────────────────────────────
onRecordDeleteRequest(function(e) {
  if (e.collection.name !== 'procedures') { e.next(); return; }

  var auth = e.auth;
  if (!auth) { throw new BadRequestError("Authentication required"); }
  var role = '';
  try { role = String(auth.get('role') || ''); } catch(err) {}
  if (role !== 'admin') { throw new ForbiddenError("Only admins can delete procedures"); }

  // Block delete if any logbook_entry references this procedure
  try {
    var refs = $app.findRecordsByFilter('logbook_entries', "procedure = '" + e.record.id + "'", '', 1, 0);
    if (refs.length > 0) {
      throw new BadRequestError("Cannot delete: this procedure has logbook entries. Retire it instead.");
    }
  } catch(checkErr) {
    var msg = String(checkErr);
    if (msg.indexOf('Cannot delete') >= 0) { throw checkErr; }
    // If findRecordsByFilter itself failed, allow delete (collection might be empty)
  }

  e.next();
}, 'procedures');
