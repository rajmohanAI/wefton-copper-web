/**
 * Fetches city and state from an Indian PIN code using the postal API.
 * Returns null if the PIN code is invalid or the API is unreachable.
 */
export interface PincodeResult {
  city: string;
  state: string;
  district: string;
}

export async function lookupPincode(pincode: string): Promise<PincodeResult | null> {
  if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
    return null;
  }

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    const data = await res.json();

    if (!data?.[0] || data[0].Status !== 'Success' || !data[0].PostOffice?.length) {
      return null;
    }

    const postOffice = data[0].PostOffice[0];
    return {
      city: postOffice.Block && postOffice.Block !== 'NA' ? postOffice.Block : postOffice.District,
      state: postOffice.State,
      district: postOffice.District,
    };
  } catch {
    return null;
  }
}
