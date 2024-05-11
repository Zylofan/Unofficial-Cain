/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class BitdActor extends Actor {

  /** @override */
  prepareData() {
    super.prepareData();
  }

  /** @override*/
  prepareDerivedData() {
    const actorData = this;
    const systemData = actorData.system;

    if (actorData.type == 'character') this._prepareCharacterData(actorData, systemData);
    if (actorData.type == 'crew') this._prepareCrewData(systemData);
  }

  _prepareCharacterData(actorData, systemData) {
    for (const [attrKey, attribute] of Object.entries(systemData.attributes)) {
      attribute.value = 0;

      for (const [actionKey, action] of Object.entries(attribute.actions)) {
        action.max = 4;
        systemData[actionKey] = foundry.utils.deepClone(action);

        if (action.value > 0) {
          attribute.value += 1;
        }
      }
    }

    // Inventory slots
    let load = 0;
    for (let i of actorData.items) {
      if (i.system.loadout && i.system.equipped) {
        load += i.system.loadout;
      }
    }
    systemData.load.value = load;
  }

  _prepareCrewData(systemData) {
    if (systemData.turf < 0) {
      systemData.turf = 0;
    } else if (systemData.turf > 6) {
      systemData.turf = 6;
    }
    systemData.rep.max = 12 - systemData.turf;
  }

  _onCreateDescendantDocuments(parent, collection, documents, data, options, userId) {
    super._onCreateDescendantDocuments(parent, collection, documents, data, options, userId);

    for (const dataItem of data) {
      if (dataItem.type == "playbook" && this.type == "character") {
        for (const i of this.items) {
          if (i.type === 'playbook' && i._id != dataItem._id) {
            const item2Delete = this.items.get(i._id);
            item2Delete.delete();
          }
        }

        this.update({ "system.playbook": dataItem._id });

        const forLoad = ["abilities", "contacts", "inventory"]
        this._preCreatePlaybook(dataItem, forLoad);
      }
    }
  }

  async _preCreatePlaybook(playbook, forLoad) {
    const oldItems = this.items;
    const newItems = [];

    for (const array of forLoad) {
      const idArr = playbook.system[array];
      for (const itemData of idArr) {
        const item = await fromUuid(itemData.uuid);
        if (!oldItems.find(i => i.name === item.name)) {
          newItems.push(item);
          ui.notifications.warn(game.i18n.localize("BITD.ItemExistsName"));
        }
      }
    }

    const cls = getDocumentClass("Item");
    for (const item of newItems) {
      cls.create(item, {parent: this})
    }
  }
}
