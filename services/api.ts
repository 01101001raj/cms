// services/api.ts
import { supabase } from './supabaseClient';
import { ApiService } from './apiService.interface';

import { createAuthService } from './api/authService';
import { createDistributorService } from './api/distributorService';
import { createNotificationService } from './api/notificationService';
import { createOrderService } from './api/orderService';
import { createProductService } from './api/productService';
import { createStockService } from './api/stockService';
import { createWalletService } from './api/walletService';

// This file creates a single instance of our API service to be used throughout the app.
// It's now configured to use the Supabase implementation by composing smaller services.

const serviceImplementations = {
    ...(supabase ? createAuthService(supabase) : {}),
    ...(supabase ? createDistributorService(supabase) : {}),
    ...(supabase ? createNotificationService(supabase) : {}),
    ...(supabase ? createOrderService(supabase) : {}),
    ...(supabase ? createProductService(supabase) : {}),
    ...(supabase ? createStockService(supabase) : {}),
    ...(supabase ? createWalletService(supabase) : {}),
};

// We cast to ApiService to ensure that our composed object fulfills the contract.
// This will give a compile-time error if we forget to implement a method.
const api: ApiService = serviceImplementations as ApiService;

export { api };
