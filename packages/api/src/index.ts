// Auth Services
export { setUserRole, getUserProfile, updateUserProfile } from './auth';

// Location Services
export {
  getSavedLocations,
  saveLocation,
  updateLocation,
  setDefaultLocation,
  deleteLocation,
  addLocation,
} from './location/locationService';

// Provider Services
export {
  searchProviders,
  listNearbyProviders,
  getProviderProfile,
  getProviderStats,
  getProviderServices,
  type SearchProvidersParams,
  type SearchProvidersResult,
  type ProviderStats,
  type ProviderService,
} from './providers';

// Ratings Services
export {
  getProviderRatings,
  getRatingsGivenByProvider,
  getAverageRating,
  getRatingStats,
  createRating,
  type RatingStats,
} from './ratings';

// Services Services
export {
  getAllServiceCategories,
  getServiceCategory,
  getAllServiceTypes,
  getServiceTypesByCategory,
  getServiceType,
  searchServiceTypes,
  getCategoriesWithServices,
} from './services';

// Booking Services
export {
  createBooking,
  getBooking,
  updateBooking,
  cancelBooking,
  getActiveBookings,
  getBookingHistory,
  getProviderBookings,
  updateBookingStatus,
} from './bookings';

// Quote Services
export {
  createQuote,
  getQuote,
  getQuoteForBooking,
  getQuotesForBooking,
  getQuotesForProvider,
  acceptQuote,
  rejectQuote,
  updateQuote,
  expireQuote,
} from './quotes';

// Payment Services
export {
  createOzowPayment,
  recordPayment,
  getPayment,
  getPaymentStatus,
  getPaymentHistory,
  refundPayment,
  updatePaymentStatus,
  getProviderPayments,
} from './payments';
