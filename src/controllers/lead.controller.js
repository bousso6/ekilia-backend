import { asyncHandler } from '../utils/asyncHandler.js';
import * as leadService from '../services/lead.service.js';

export const getDiagnosticForm = asyncHandler(async (req, res) => {
  const form = await leadService.getDiagnosticForm();
  res.status(200).json({ success: true, data: { form } });
});

export const createLead = asyncHandler(async (req, res) => {
  const lead = await leadService.createLead(req.body);
  res.status(201).json({
    success: true,
    message: 'Votre demande a bien été enregistrée.',
    data: { lead },
  });
});

export const listLeads = asyncHandler(async (req, res) => {
  const data = await leadService.listLeads(req.query);
  res.status(200).json({ success: true, data });
});

export const getLead = asyncHandler(async (req, res) => {
  const lead = await leadService.getLeadById(req.params.id);
  res.status(200).json({ success: true, data: { lead } });
});

export const updateLead = asyncHandler(async (req, res) => {
  const lead = await leadService.updateLead(req.params.id, req.body);
  res.status(200).json({
    success: true,
    message: 'Lead mis à jour avec succès',
    data: { lead },
  });
});

export const convertLead = asyncHandler(async (req, res) => {
  const data = await leadService.convertLead(req.params.id, req.user._id);
  res.status(200).json({
    success: true,
    message: 'Lead converti avec succès',
    data,
  });
});
