// Runs in an isolated document at the game's origin, before any game scripts load.
function eraseLocalGame(store, owner) {
    const guest = owner === null;
    const read = key => JSON.parse(store.getItem(key));
    const active = read('kdCloud_activeAccount');
    const hasLiveView = guest ? active === null : active === owner;
    if (guest && !hasLiveView) return false;

    const name = guest ? 'guest' : owner;
    const scope = guest ? 'guest' : 'account:' + owner;
    const suffix = encodeURIComponent(name);
    const owned = value => guest ? !value || value === 'guest' : value === owner;
    const keys = Array.from({length: store.length}, (_, i) => store.key(i));
    const remove = new Set(['kdWorkshop_v1:' + suffix, 'kdCloud_login_' + suffix,
        'kdExitUndo:campaign:' + scope, 'kdExitUndo:daily:' + scope]);
    if (!guest) {
        for (const prefix of ['kdCloud_account_', 'kdCloud_ops_', 'kdCloud_counter_']) remove.add(prefix + suffix);
    }
    // Match the per-profile key used in onboarding.js.
    let a = 2166136261, b = 2246822519;
    for (let i = 0; i < name.length; i++) {
        a = Math.imul(a ^ name.charCodeAt(i), 16777619);
        b = Math.imul(b ^ name.charCodeAt(i), 3266489917);
    }
    remove.add('kd_onboarding_v1_' + [a,b].map(n => (n >>> 0).toString(16).padStart(8,'0')).join(''));
    for (const key of keys) {
        if (key.startsWith('kd64_doubleRequest_')) {
            const request = read(key);
            if (request && owned(request.owner)) remove.add(key);
        } else if (hasLiveView && (key.startsWith('kd64_') || key === 'kd3_name' || key === 'kd61_avatar')) {
            remove.add(key);
        }
    }
    for (const key of remove) store.removeItem(key);
    const journals = read('kdDaily_rewardJournals');
    if (journals && Object.hasOwn(journals, scope)) {
        delete journals[scope];
        store.setItem('kdDaily_rewardJournals', JSON.stringify(journals));
    }
    const owners = read('kdCloud_rewardOwners');
    if (owners) {
        for (const [id, value] of Object.entries(owners)) if (owned(value)) delete owners[id];
        store.setItem('kdCloud_rewardOwners', JSON.stringify(owners));
    }
    if (guest) store.removeItem('kdCloud_guestReward');
    if (!guest && read('kdCloud_guestOwner') === owner) {
        store.removeItem('kdCloud_migrationBackup');
        store.removeItem('kdCloud_guestOwner');
    }
    // Remove the ownership marker last so an interrupted cleanup can finish the live view.
    if (hasLiveView) store.removeItem('kdCloud_activeAccount');
    return true;
}
