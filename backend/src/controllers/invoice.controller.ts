import { Request, Response, NextFunction } from "express";
import {
  approveInvoice,
  markInvoicePaid,
  markInvoiceReceived,
  rejectInvoice,
  submitInvoice,
} from "../service/invoice.service";

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { submittingParty, submittingCategory, dateDue, description, amount } = req.body;
    const projectId = req.params.projectId as string;
    const userId = req.user?.sub;

    const invoiceId = await submitInvoice(
      { submittingParty, submittingCategory, dateDue, description, amount },
      projectId,
      userId
    );

    res.status(200).json({ success: true, invoiceId });
  } catch (err) {
    next(err);
  }
}

export async function approve(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.params.projectId as string;
    const invoiceId = req.params.invoiceId as string;
    const userId = req.user?.sub;
    await approveInvoice(invoiceId, projectId, userId);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function paid(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.params.projectId as string;
    const invoiceId = req.params.invoiceId as string;
    const userId = req.user?.sub;
    await markInvoicePaid(invoiceId, projectId, userId);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function received(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.params.projectId as string;
    const invoiceId = req.params.invoiceId as string;
    const userId = req.user?.sub;
    await markInvoiceReceived(invoiceId, projectId, userId);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function reject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.params.projectId as string;
    const invoiceId = req.params.invoiceId as string;
    const userId = req.user?.sub;
    const { rejectionReason } = req.body;
    await rejectInvoice(invoiceId, projectId, userId, rejectionReason);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}
