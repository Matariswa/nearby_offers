export interface ShopFormValues {
  shopName: string;
  category: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  openingTime: string;
  closingTime: string;
  description: string;
  logo: string | null;
  shopImages: string[];
  latitude: string;
  longitude: string;
}

export function validateShopForm(values: ShopFormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.shopName.trim()) {
    errors.shopName = "Shop name is required.";
  }

  if (!values.category.trim()) {
    errors.category = "Category is required.";
  }

  const phoneTrimmed = values.phone.trim();
  if (!phoneTrimmed) {
    errors.phone = "Phone number is required.";
  } else if (!/^\+?[\d\s-()]{7,20}$/.test(phoneTrimmed)) {
    errors.phone = "Please enter a valid phone number.";
  }

  if (!values.address.trim()) {
    errors.address = "Address is required.";
  }

  if (!values.city.trim()) {
    errors.city = "City is required.";
  }

  if (!values.state.trim()) {
    errors.state = "State is required.";
  }

  const pincodeTrimmed = values.pincode.trim();
  if (!pincodeTrimmed) {
    errors.pincode = "Pincode is required.";
  } else if (!/^\d{5,6}$/.test(pincodeTrimmed)) {
    errors.pincode = "Pincode must be a valid 5 or 6 digit code.";
  }

  if (!values.openingTime.trim()) {
    errors.openingTime = "Opening time is required.";
  }

  if (!values.closingTime.trim()) {
    errors.closingTime = "Closing time is required.";
  }

  if (values.latitude.trim() !== "") {
    const lat = Number(values.latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.latitude = "Latitude must be a valid number between -90 and 90.";
    }
  }

  if (values.longitude.trim() !== "") {
    const lng = Number(values.longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.longitude = "Longitude must be a valid number between -180 and 180.";
    }
  }

  return errors;
}
