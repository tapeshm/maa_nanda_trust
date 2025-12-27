/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import { type Language, DEFAULT_LANGUAGE } from '../../../utils/i18n'

const LABELS = {
  en: {
    privacyNotice: "Your information is strictly used for donation auditing purpose. We will never use and disclose your data for any other purposes.",
    formTitle: "Donor Information (Optional)",
    nameLabel: "Name",
    namePlaceholder: "Enter your name",
    mobileLabel: "Mobile Number",
    mobilePlaceholder: "10-digit mobile number",
    panLabel: "PAN Number",
    panPlaceholder: "e.g., ABCDE1234F",
    amountLabel: "Committed Amount",
    amountPlaceholder: "Amount you plan to donate",
    submitButton: "Submit Information",
    successMessage: "Thank you! Your information has been recorded.",
    errorMessage: "Something went wrong. Please try again.",
  },
  hi: {
    privacyNotice: "आपकी जानकारी केवल दान लेखापरीक्षा के उद्देश्य से उपयोग की जाती है। हम आपके डेटा का किसी अन्य उद्देश्य के लिए कभी उपयोग या प्रकटीकरण नहीं करेंगे।",
    formTitle: "दानकर्ता की जानकारी (वैकल्पिक)",
    nameLabel: "नाम",
    namePlaceholder: "अपना नाम दर्ज करें",
    mobileLabel: "मोबाइल नंबर",
    mobilePlaceholder: "10 अंकों का मोबाइल नंबर",
    panLabel: "पैन नंबर",
    panPlaceholder: "जैसे, ABCDE1234F",
    amountLabel: "प्रतिबद्ध राशि",
    amountPlaceholder: "जो राशि आप दान करना चाहते हैं",
    submitButton: "जानकारी जमा करें",
    successMessage: "धन्यवाद! आपकी जानकारी दर्ज कर ली गई है।",
    errorMessage: "कुछ गलत हो गया। कृपया पुनः प्रयास करें।",
  }
}

type DonorInfoFormProps = {
  lang?: Language
  csrfToken: string
  success?: boolean
  error?: boolean
}

const DonorInfoForm: FC<DonorInfoFormProps> = ({
  lang = DEFAULT_LANGUAGE,
  csrfToken,
  success = false,
  error = false
}) => {
  const labels = LABELS[lang]
  const formAction = lang === 'hi' ? '/hi/donate/submit' : '/donate/submit'

  return (
    <div class="mt-12 max-w-md mx-auto">
      {/* Privacy Notice */}
      <div class="mb-6 p-4 bg-amber-900/20 border border-amber-500/30 rounded-lg">
        <p class="text-sm text-amber-200/80 text-center leading-relaxed">
          {labels.privacyNotice}
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div class="mb-6 p-4 bg-green-900/30 border border-green-500/30 rounded-lg">
          <p class="text-sm text-green-300 text-center">
            {labels.successMessage}
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div class="mb-6 p-4 bg-red-900/30 border border-red-500/30 rounded-lg">
          <p class="text-sm text-red-300 text-center">
            {labels.errorMessage}
          </p>
        </div>
      )}

      {/* Form */}
      <form
        action={formAction}
        method="POST"
        class="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-md"
      >
        <input type="hidden" name="csrf_token" value={csrfToken} />

        <h3 class="text-lg font-serif text-amber-200 mb-6 text-center">
          {labels.formTitle}
        </h3>

        {/* Name Field */}
        <div class="mb-4">
          <label for="name" class="block text-sm text-white/70 mb-2">
            {labels.nameLabel}
          </label>
          <input
            type="text"
            id="name"
            name="name"
            placeholder={labels.namePlaceholder}
            maxlength={255}
            class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
          />
        </div>

        {/* Mobile Field */}
        <div class="mb-4">
          <label for="mobile" class="block text-sm text-white/70 mb-2">
            {labels.mobileLabel}
          </label>
          <input
            type="tel"
            id="mobile"
            name="mobile"
            placeholder={labels.mobilePlaceholder}
            pattern="[0-9]{10}"
            maxlength={10}
            class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
          />
        </div>

        {/* PAN Field */}
        <div class="mb-4">
          <label for="pan_number" class="block text-sm text-white/70 mb-2">
            {labels.panLabel}
          </label>
          <input
            type="text"
            id="pan_number"
            name="pan_number"
            placeholder={labels.panPlaceholder}
            pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
            maxlength={10}
            class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 uppercase focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
          />
        </div>

        {/* Committed Amount Field */}
        <div class="mb-6">
          <label for="committed_amount" class="block text-sm text-white/70 mb-2">
            {labels.amountLabel}
          </label>
          <input
            type="number"
            id="committed_amount"
            name="committed_amount"
            placeholder={labels.amountPlaceholder}
            min={1}
            step="0.01"
            class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          class="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-transparent"
        >
          {labels.submitButton}
        </button>
      </form>
    </div>
  )
}

export default DonorInfoForm
