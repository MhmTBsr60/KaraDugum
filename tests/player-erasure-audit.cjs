'use strict';
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {runInNewContext} = require('node:vm');
const path = require('node:path');
const erase = runInNewContext(readFileSync(path.join(__dirname, '../erase-local.js'), 'utf8') + '\neraseLocalGame');
class Store extends Map {
    get length() { return this.size; }
    key(index) { return [...this.keys()][index]; }
    getItem(key) { return this.get(key) ?? null; }
    setItem(key, value) { this.set(key, value); }
    removeItem(key) { this.delete(key); }
}
const alice = 'player/a', bob = 'player/b';
function fixture() {
    const store = new Store();
    const add = (key, value) => store.setItem(key, JSON.stringify(value));
    add('kdCloud_activeAccount', alice);
    add('kdCloud_guestOwner', alice);
    add('kdCloud_migrationBackup', {kd64_level:'7'});
    add('kd64_level', 14);
    add('kdCloud_device', 'install');
    add('kdDaily_rewardJournals', {['account:' + alice]:{}, ['account:' + bob]:{}, guest:{}});
    add('kdCloud_rewardOwners', {a:alice, b:bob, g:'guest'});
    for (const who of [alice, bob]) {
        for (const stem of ['kdCloud_account_', 'kdCloud_login_', 'kdCloud_ops_', 'kdCloud_counter_', 'kdWorkshop_v1:']) {
            add(stem + encodeURIComponent(who), {progress:9});
        }
        add('kd64_doubleRequest_' + who, {owner:who});
        add('kdExitUndo:daily:account:' + who, {moves:2});
    }
    return store;
}
const store = fixture();
const untouched = new Map(store);
assert.equal(erase(store, null), false);
assert.deepEqual([...store], [...untouched]);
assert.equal(erase(store, alice), true);
assert.equal(erase(store, alice), true);
for (const [key, value] of untouched) {
    if (key.includes(encodeURIComponent(bob)) || key.endsWith(bob)) assert.equal(store.getItem(key), value);
    if (key.includes(encodeURIComponent(alice)) || key.endsWith(alice)) assert.equal(store.getItem(key), null);
}
assert.equal(store.getItem('kd64_level'), null);
assert.equal(store.getItem('kdCloud_migrationBackup'), null);
assert.equal(store.getItem('kdCloud_guestOwner'), null);
assert.equal(store.getItem('kdCloud_device'), '"install"');
assert.deepEqual(JSON.parse(store.getItem('kdCloud_rewardOwners')), {b:bob, g:'guest'});
assert.deepEqual(JSON.parse(store.getItem('kdDaily_rewardJournals')), {['account:' + bob]:{}, guest:{}});
const interrupted = fixture();
interrupted.removeItem = function(key) {
    if (key === 'kdCloud_migrationBackup') throw Error('storage unavailable');
    this.delete(key);
};
assert.throws(() => erase(interrupted, alice));
assert.equal(JSON.parse(interrupted.getItem('kdCloud_activeAccount')), alice);
delete interrupted.removeItem;
assert.equal(erase(interrupted, alice), true);
assert.deepEqual([...interrupted], [...store]);
const inactive = fixture();
erase(inactive, bob);
assert.equal(inactive.getItem('kd64_level'), '14');
assert.equal(JSON.parse(inactive.getItem('kdCloud_activeAccount')), alice);
const guest = fixture();
guest.removeItem('kdCloud_activeAccount');
erase(guest, null);
assert.equal(guest.getItem('kd64_level'), null);
assert.equal(guest.getItem('kdCloud_migrationBackup'), '{"kd64_level":"7"}');
assert.ok(guest.has('kdCloud_account_' + encodeURIComponent(alice)));
assert.deepEqual(JSON.parse(guest.getItem('kdDaily_rewardJournals')), {['account:' + alice]:{}, ['account:' + bob]:{}});
console.log('PASS: scoped erasure, guest isolation, foreign-account preservation, interrupted and repeated requests');
