import type { OfferType } from "@/types/offer";

export interface OfferFormValues {
  title: string;
  description: string;
  offerType: OfferType | "";
  discountValue: string;
  couponCode: string;
  image: string | null;
  startDate: string;
  endDate: string;
  termsAndConditions: string;
  active: boolean;
  featured: boolean;
}

export function validateOfferForm(values: OfferFormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.title.trim()) {
    errors.title = "Offer title is required.";
  } else if (values.title.trim().length < 3) {
    errors.title = "Title must be at least 3 characters.";
  }

  if (!values.description.trim()) {
    errors.description = "Description is required.";
  }

  if (!values.offerType) {
    errors.offerType = "Please select an offer type.";
  }

  const discountVal = Number(values.discountValue);
  if (!values.discountValue) {
    errors.discountValue = "Discount value is required.";
  } else if (isNaN(discountVal) || discountVal <= 0) {
    errors.discountValue = "Discount value must be a positive number.";
  }

  if (!values.startDate) {
    errors.startDate = "Start date is required.";
  }

  if (!values.endDate) {
    errors.endDate = "End date is required.";
  }

  if (values.startDate && values.endDate) {
    const start = new Date(values.startDate);
    const end = new Date(values.endDate);
    if (end < start) {
      errors.endDate = "End date cannot be earlier than start date.";
    }
  }

  if (!values.termsAndConditions.trim()) {
    errors.termsAndConditions = "Terms and conditions are required.";
  }

  return errors;
}
