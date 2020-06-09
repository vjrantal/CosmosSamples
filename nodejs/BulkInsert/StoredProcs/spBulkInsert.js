function spBulkInsertItems(items, useUpsert = false) {
    const context = getContext();
    const collection = context.getCollection();
    const collectionLink = collection.getSelfLink();
    const documentAction = useUpsert ? collection.upsertDocument : collection.createDocument;
    let count = 0;
    const upsertNext = () => {
        const accepted = (count < items.length) && documentAction(collectionLink, items[count], (err) => {
            if (err) {
                throw err;
            }
            ++count;
            upsertNext();
        });
        if (!accepted) {
            context.getResponse().setBody({ processed: count });
        }
    };
    upsertNext();
}
