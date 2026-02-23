import { z } from 'zod';
import { listSettings, updateSetting } from '../services/settingsService.js';

const updateSettingSchema = z.object({
  value: z.any()
});

export const listSettingsController = async (req, res) => {
  const settings = await listSettings(req.auth.tenant.id);
  return res.json({ data: settings });
};

export const updateSettingController = async (req, res) => {
  const payload = updateSettingSchema.parse(req.body);

  const setting = await updateSetting({
    tenantId: req.auth.tenant.id,
    key: req.params.key,
    value: payload.value,
    actor: req.auth
  });

  return res.json({ data: setting });
};
