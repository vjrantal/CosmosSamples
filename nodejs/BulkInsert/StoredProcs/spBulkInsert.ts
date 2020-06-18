
function spBulkInsertItemsV1(items: any[], useUpsert: boolean, ignoreInsertErrors: boolean) {
    const context = getContext();
    const collection = context.getCollection();
    const collectionLink = collection.getSelfLink();
    const documentFn = useUpsert ? collection.upsertDocument : collection.createDocument;
    let count = 0;
    const upsertNext = (): void => {
      const accepted = (count < items.length) && documentFn(collectionLink, items[count], (err) => {
        if (err) {
          if (err.number !== 409 || !ignoreInsertErrors) {
            throw err;
          }
        }
        ++count;
        upsertNext();
      });
  
      if (!accepted) {
        context.getResponse().setBody({ processed: count });
      }
    }
    upsertNext();
  }
  