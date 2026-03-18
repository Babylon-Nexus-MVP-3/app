import { Request, Response, NextFunction } from "express";
import { submitInvoice } from "../service/invoice.service";

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
