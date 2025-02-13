import { withPluginApi } from "discourse/lib/plugin-api";
import { ajax } from "discourse/lib/ajax";
import { popupAjaxError } from "discourse/lib/ajax-error";
import { computed } from "@ember/object";

export default {
  name: "user-signature-by-group",
  initialize(container) {
    withPluginApi("0.8.31", (api) => {
      // Add signature field to user preferences
      api.modifyClass("controller:preferences/profile", {
        pluginId: "user-signature-by-group",
        
        canHaveSignature: computed("model.groups", function() {
          const settings = container.lookup("service:site-settings");
          const allowedGroups = (settings.signature_groups || "").split("|");
          
          // Allow admins, staff and moderators
          if (this.model.admin || this.model.staff || this.model.moderator) {
            return true;
          }
          
          return this.model.groups.some(g => allowedGroups.includes(g.name));
        }),

        actions: {
          saveSignature() {
            if (!this.canHaveSignature) return;
            
            ajax(`/u/${this.model.username}.json`, {
              type: "PUT",
              data: {
                signature: this.model.custom_fields.signature
              }
            }).catch(popupAjaxError);
          }
        }
      });

      // Add signature to posts
      api.decorateWidget("post-contents:after", helper => {
        const post = helper.getModel();
        const user = post.user;
        
        if (!user || !user.custom_fields || !user.custom_fields.signature) {
          return;
        }

        const allowedGroups = (settings.signature_groups || "").split("|");
        const userGroups = user.groups || [];
        
        // Allow admins, staff and moderators
        if (user.admin || user.staff || user.moderator) {
          return renderSignature();
        }
        
        if (!userGroups.some(g => allowedGroups.includes(g.name))) {
          return;
        }

        function renderSignature() {
          return helper.h("div.user-signature", [
            helper.h("div.signature-user-info", [
              helper.h("img.signature-avatar", {
                attributes: {
                  src: user.avatar_template.replace("{size}", "45")
                }
              }),
              helper.h("a.signature-username", {
                attributes: {
                  href: `/u/${user.username}`
                }
              }, user.username)
            ]),
            helper.h("div.signature-content", helper.rawHtml(user.custom_fields.signature))
          ]);
        }

        return renderSignature();
      });
    });
  }
}; 