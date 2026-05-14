<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\AllowanceController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\AttributeController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AwardController;
use App\Http\Controllers\BarcodePrintController;
use App\Http\Controllers\BonusSettingController;
use App\Http\Controllers\BorrowerController;
use App\Http\Controllers\BrandController;
use App\Http\Controllers\BusinessSettingController;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\Controller;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DamageController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DealershipController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\EmployeeSalaryAdvanceController;
use App\Http\Controllers\ExchangeController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\ExpenseReportController;
use App\Http\Controllers\ExtraCashController;
use App\Http\Controllers\HeaderController;
use App\Http\Controllers\InstallmentController;
use App\Http\Controllers\InvestmentController;
use App\Http\Controllers\InvestmentReturnController;
use App\Http\Controllers\InvestorController;
use App\Http\Controllers\LadgerController;
use App\Http\Controllers\LeaveController;
use App\Http\Controllers\LedgerController;
use App\Http\Controllers\LoanController;
use App\Http\Controllers\LoanRepaymentController;
use App\Http\Controllers\ModuleController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OutletController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\PickupHoldController;
use App\Http\Controllers\PlanController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProvidentFundController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\PurchaseReturnController;
use App\Http\Controllers\RankController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SalaryController;
use App\Http\Controllers\SalesController;
use App\Http\Controllers\SalesListController;
use App\Http\Controllers\SalesReturnController;
use App\Http\Controllers\SectorController;
use App\Http\Controllers\ShopController;
use App\Http\Controllers\SmsTemplateController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\SystemController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UserDepositController;
use App\Http\Controllers\UserSubscriptionsController;
use App\Http\Controllers\WarehouseController;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;


// Guest routes
Route::middleware('guest')->controller(AuthController::class)->group(function () {
    Route::get('/', 'loginView')->name('login');
    Route::post('/login', 'login')->name('login.post');
});


// auth routes
Route::middleware(['auth', 'active.subscription', 'check.system'])->group(function () {

    Route::get('/dashboard/{s?}', [DashboardController::class, 'index'])->middleware('permission:dashboard.view')->name('home');

    // user deposit route will be here
    Route::resource('deposits', UserDepositController::class)->names([
        'index' => 'deposits.index',
        'create' => 'deposits.create',
        'store' => 'deposits.store',
        'show' => 'deposits.show',
        'edit' => 'deposits.edit',
        'update' => 'deposits.update',
        'destroy' => 'deposits.destroy',
    ])->middleware('permission:deposits.view|deposits.create|deposits.edit|deposits.delete');

    Route::post('/deposits/{deposit}/approve', [UserDepositController::class, 'approve'])
        ->middleware('permission:deposits.approve')
        ->name('deposits.approve');

    Route::post('/deposits/{deposit}/reject', [UserDepositController::class, 'reject'])
        ->middleware('permission:deposits.reject')
        ->name('deposits.reject');


    //outles rount will be here
    Route::controller(OutletController::class)->prefix('outlets')->group(function () {
        Route::get('/', 'index')->middleware('permission:outlets.view')->name('outlets.index');
        Route::post('/store', 'store')->middleware('permission:outlets.create')->name('outlets.store');
        Route::get('/{id}', 'show')->middleware('permission:outlets.show')->name('outlets.show');
        Route::get('/edit/{id}', 'edit')->middleware('permission:outlets.edit')->name('outlets.edit');
        Route::put('/{id}', 'update')->middleware('permission:outlets.edit')->name('outlets.update');
        Route::delete('/{id}', 'destroy')->middleware('permission:outlets.delete')->name('outlets.delete');
    });

    Route::post('/outlets/{outlet}/login', [OutletController::class, 'login'])
        ->middleware('permission:outlets.login')
        ->name('outlets.login');

    Route::post('/outlets/logout', [OutletController::class, 'logout'])
        ->middleware('permission:outlets.logout')
        ->name('outlets.logout');

    Route::post('/outlets/switch', [OutletController::class, 'switchOutlet'])
        ->middleware('permission:outlets.switch')
        ->name('outlets.switch');

    // users managment
    Route::controller(UserController::class)->prefix('users')->group(function () {
        Route::get('/', 'index')->middleware('permission:users.view')->name('userlist.view');
        Route::get('/create', 'create')->middleware('permission:users.create')->name('users.create');
        Route::post('/store', 'store')->middleware('permission:users.create')->name('userlist.store');
        Route::get('/edit/{id}', 'edit')->middleware('permission:users.edit')->name('userlist.edit');
        Route::post('/update/{id}', 'update')->middleware('permission:users.edit')->name('users.update');
        Route::get('/delete/{id}', 'delete')->middleware('permission:users.delete')->name('userlist.delete');
        Route::post('/toggle-status/{id}', 'toggleStatus')->middleware('permission:users.edit')->name('users.toggle-status');
        Route::post('/toggle-user-type', 'toggleUserType')->name('toggle.user.type');
    });

    Route::controller(UserController::class)->prefix('users')->group(function () {
        Route::post('/hold/{id}', 'hold')
            ->middleware('permission:users.hold')
            ->name('users.hold');
        Route::post('/active/{id}', 'active')
            ->middleware('permission:users.active')
            ->name('users.active');
    });

    Route::get('api/sales/{batch_no}', [SalesController::class, 'stockInvoice']);


    // customer manage
    Route::controller(CustomerController::class)->prefix('customer')->group(function () {
        Route::get('/', 'index')->middleware('permission:customer.view')->name('customer.index');
        Route::get('/show/{id}/', 'show')->middleware('permission:customer.view')->name('customer.show');
        Route::post('/add', 'store')->middleware('permission:customer.create')->name('customer.store');
        Route::get('/delete/{id}', 'del')->middleware('permission:customer.delete')->name('customer.del');
        Route::get('/edit/{id}', 'edit')->middleware('permission:customer.edit')->name('customer.edit');
        Route::put('/update/{id}', 'update')->middleware('permission:customer.edit')->name('customer.update');
    });

    // sector
    Route::controller(SectorController::class)->group(function () {
        Route::get('/category', 'category_view')->middleware('permission:category.view')->name('category.view');
        Route::post('/category', 'category_store')->middleware('permission:category.create')->name('category.store');
        Route::get('/category/edit/{id}', 'category_edit')->middleware('permission:category.edit')->name('category.edit');
        Route::get('/category/del/{id}', 'category_del')->middleware('permission:category.delete')->name('category.del');
    });

    // supplier
    Route::get('/supplier', [SupplierController::class, 'index'])->middleware('permission:supplier.view')->name('supplier.view');
    Route::post('/supplier', [SupplierController::class, 'store'])->middleware('permission:supplier.create')->name('supplier.store');
    Route::put('/supplier/update/{id}', [SupplierController::class, 'update'])->middleware('permission:supplier.edit')->name('supplier.update');
    Route::get('/supplier/edit/{id}', [SupplierController::class, 'edit'])->middleware('permission:supplier.edit')->name('supplier.edit');
    Route::delete('/supplier/del/{id}', [SupplierController::class, 'destroy'])->middleware('permission:supplier.delete')->name('supplier.del');
    Route::get('/supplier/show/{id}', [SupplierController::class, 'show'])->middleware('permission:supplier.show')->name('supplier.show');

    // products
    Route::controller(ProductController::class)->prefix('/product')->group(function () {
        Route::get('/', 'index')->middleware('permission:product.view')->name('product.list');
        Route::get('/add', 'add_index')->middleware('permission:product.create')->name('product.add');
        Route::post('/add', 'update')->middleware('permission:product.create')->name('product.add.post');
        Route::get('/del/{id}', 'del')->middleware('permission:product.delete')->name('product.del');
    });

    // sales
    Route::controller(SalesController::class)->prefix('/sales')->group(function () {

        // ✅ MUST BE BEFORE /{sale}
        Route::post('/scan-barcode', 'scanBarcode')
            ->middleware('permission:sales.create')
            ->name('sales.scan-barcode');

        Route::get('/add', 'createPos')->middleware('permission:sales.create')->name('sales.add');
        Route::post('/store', 'store')->middleware('permission:sales.create')->name('sales.store');

        Route::post('/store/pos', 'storePos')
            ->middleware('permission:sales.create')
            ->name('salesPos.store');

        Route::post('/store/shadow', 'shadowStore')->middleware('permission:sales.create')->name('salesShadow.store');

        Route::get('/create', 'create')->middleware('permission:sales.create')->name('sales.create');
        Route::get('/', 'index')->middleware('permission:sales.view')->name('sales.index');
        Route::get('/list/pos', 'indexPos')->middleware('permission:sales.view')->name('salesPos.index');

        // ✅ Restrict sale id (so scan-barcode never matches)
        Route::get('/{sale}', 'show')->whereNumber('sale')->middleware('permission:sales.view')->name('sales.show');
        Route::get('/{sale}/pos', 'showPos')->whereNumber('sale')->middleware('permission:sales.print')->name('salesPrint.show');

        Route::get('/{sale}/print', 'print')->whereNumber('sale')->middleware('permission:sales.print')->name('sales.print');
        Route::get('/{sale}/download-pdf', 'downloadPdf')->whereNumber('sale')->middleware('permission:sales.download_pdf')->name('sales.download.pdf');

        Route::delete('/{sale}', 'destroy')->whereNumber('sale')->middleware('permission:sales.delete')->name('sales.destroy');

        Route::delete('/sales-items/{id}', 'destroy')->middleware('permission:sales.delete')->name('sales.items.destroy');
    });


    Route::get('/sales/scan-barcode/{barcode}', [SalesController::class, 'scanBarcode'])
        ->middleware('permission:sales.create')
        ->name('sales.scan.barcode');

    Route::post('/pos/print-request/{id}', [SalesController::class, 'printRequest'])->name('print.request');


    // Sales Return Routes
    Route::get('/return', [SalesReturnController::class, 'index'])
        ->middleware('permission:sales_return.view')
        ->name('salesReturn.list');

    Route::get('/return/pickup', [SalesReturnController::class, 'indexPickup'])
        ->middleware('permission:sales_return.pickup')
        ->name('salesReturn.pickup');


    Route::get('/return/create', [SalesReturnController::class, 'create'])
        ->middleware('permission:sales_return.create')
        ->name('return.create');

    Route::post('/return/store', [SalesReturnController::class, 'store'])
        ->middleware('permission:sales_return.create')
        ->name('return.store');

    Route::post('/approve/{id}/return', [SalesReturnController::class, 'approve'])
        ->middleware('permission:return.approve')
        ->name('return.approve');

    Route::get('/return/{id}', [SalesReturnController::class, 'show'])
        ->middleware('permission:sales_return.show')
        ->name('salesReturn.show');

    Route::get('/return/{id}/edit', [SalesReturnController::class, 'edit'])
        ->middleware('permission:sales_return.edit')
        ->name('salesReturn.edit');

    Route::put('/return/{id}', [SalesReturnController::class, 'update'])
        ->middleware('permission:sales_return.edit')
        ->name('salesReturn.update');

    Route::delete('/return/{id}', [SalesReturnController::class, 'destroy'])
        ->middleware('permission:return.delete')
        ->name('salesReturn.destroy');

    Route::controller(BusinessSettingController::class)
        ->prefix('business-settings')
        ->group(function () {
            Route::get('/', 'edit')
                ->name('business-settings.edit');

            Route::put('/', 'update')
                ->name('business-settings.update');
        });


    // account route will be here
    Route::get('/accounts', [AccountController::class, 'index'])
        ->middleware('permission:accounts.view')
        ->name('accounts.index');

    Route::get('/accounts/create', [AccountController::class, 'create'])
        ->middleware('permission:accounts.create')
        ->name('accounts.create');

    Route::post('/accounts', [AccountController::class, 'store'])
        ->middleware('permission:accounts.create')
        ->name('accounts.store');

    Route::get('/accounts/{account}/edit', [AccountController::class, 'edit'])
        ->middleware('permission:accounts.edit')
        ->name('accounts.edit');

    Route::put('/accounts/{account}', [AccountController::class, 'update'])
        ->middleware('permission:accounts.edit')
        ->name('accounts.update');

    Route::delete('/accounts/{account}', [AccountController::class, 'destroy'])
        ->middleware('permission:accounts.delete')
        ->name('accounts.destroy');

    Route::get('/accounts/{account}', [AccountController::class, 'show'])
        ->middleware('permission:accounts.show')
        ->name('accounts.show');

    Route::post('/accounts/{account}/deposit', [AccountController::class, 'deposit'])
        ->middleware('permission:accounts.deposit')
        ->name('accounts.deposit');

    Route::post('/accounts/{account}/withdraw', [AccountController::class, 'withdraw'])
        ->middleware('permission:accounts.withdraw')
        ->name('accounts.withdraw');

    Route::post('/accounts/transfer', [AccountController::class, 'transfer'])
        ->middleware('permission:accounts.transfer')
        ->name('accounts.transfer');


    Route::get('/items/{id}', [SalesController::class, 'showItem'])->middleware('permission:sales.items.view')->name('sales.items.show');
    Route::get('/sales-items', [SalesController::class, 'allSalesItems'])->middleware('permission:sales.view')->name('salesItems.list');
    Route::get('/{sale}/edit', [SalesController::class, 'edit'])->middleware('permission:sales.edit')->name('sales.edit');
    Route::patch('/{sale}/update', [SalesController::class, 'update'])->middleware('permission:sales.edit')->name('sales.update');
    Route::delete('/{sale}/rejected', [SalesController::class, 'rejected'])->middleware('permission:sales.delete')->name('sales.rejected');
    Route::post('/sales/{sale}/payments', [SalesController::class, 'storePayment'])->middleware('permission:sales.payments.create')->name('sales.payments.store');

    //modules route
    Route::resource('modules', ModuleController::class)->names([
        'index' => 'modules.index',
        'create' => 'modules.create',
        'store' => 'modules.store',
        'show' => 'modules.show',
        'edit' => 'modules.edit',
        'update' => 'modules.update',
        'destroy' => 'modules.destroy',
    ]);


    // sales list
    Route::controller(SalesListController::class)->group(function () {
        Route::get('/sales/list', 'index')->middleware('permission:sales_list.view')->name('sales.list.all');
        Route::get('/sales/list/del/{id}', 'delete')->middleware('permission:sales_list.delete')->name('sales.list.del');
        Route::post('/sales/list/status', 'status')->middleware('permission:sales_list.status_update')->name('sales.list.status');
        Route::post('/sales/list/duecollact', 'collactDue')->middleware('permission:sales_list.due_collect')->name('sales.list.duecollact');
    });

    // Expense
    Route::controller(ExpenseController::class)->group(function () {
        Route::get('/expense', 'index')->middleware('permission:expense.view')->name('expenses.list');
        Route::get('/expense/category', 'category')->middleware('permission:expense.category_view')->name('expenses.category');
        Route::post('/expense/category', 'categoryStore')->middleware('permission:expense.category_create')->name('expenses.category.store');
        Route::post('/expense', 'store')->middleware('permission:expense.create')->name('expenses.post');
        Route::get('/expense/{id}', 'distroy')->middleware('permission:expense.delete')->name('expenses.del');
    });

    Route::get('/expense-reports/monthly-cost', [ExpenseReportController::class, 'monthlyCost'])
        ->name('expense-reports.monthly-cost');

    Route::get('/expense-reports/monthly-cost/pdf', [ExpenseReportController::class, 'monthlyCostPdf'])
    ->name('expense-reports.monthly-cost.pdf');

Route::get('/expense-reports/monthly-cost/excel', [ExpenseReportController::class, 'monthlyCostExcel'])
    ->name('expense-reports.monthly-cost.excel');

    // extra cash
    Route::controller(ExtraCashController::class)->group(function () {
        Route::get('/extra-cash', 'index')->middleware('permission:extra_cash.view')->name('extra.cash.all');
        Route::post('/extra-cash', 'store')->middleware('permission:extra_cash.create')->name('extra.cash.post');
        Route::get('/extra-cash/{id}', 'del')->middleware('permission:extra_cash.delete')->name('extra.cash.del');
    });

    // profile
    Route::controller(AuthController::class)->group(function () {
        Route::get('/profile', 'profileView')
            ->middleware('permission:profile.view')
            ->name('profile.view');

        Route::get('/business/profile', 'businessProfileView')
            ->middleware('permission:business_profile.view')
            ->name('businessProfile.view');

        Route::post('/business/profile/{id?}', 'businessProfileUpdate')
            ->middleware('permission:business_profile.edit')
            ->name('businessProfile.update');

        Route::post('/profile', 'profileUpdate')
            ->middleware('permission:profile.edit')
            ->name('profile.update');
        Route::get('/security', 'securityView')->name('security.view');
        Route::post('/security', 'securityUpdate')->name('security.post');
        Route::get('/logout', 'logout')->name('logout');
    });

    // installment
    Route::controller(InstallmentController::class)->group(function () {

        Route::get('/installments/{id}/{type?}', 'getInstallment')
            ->middleware('permission:installments.view')
            ->name('installments.show');

        Route::put('/installments/{id}', 'updateInstallment')
            ->middleware('permission:installments.edit')
            ->name('installments.update');

    });



    //damaged 
    Route::controller(DamageController::class)->group(function () {

        Route::get('/damages/{id}/{type?}', 'getData')
            ->middleware('permission:damages.create')
            ->name('damages.create');

        Route::post('/damages/store', 'storeDamage')
            ->middleware('permission:damages.store')
            ->name('damages.store');

        Route::get('/damages', 'index')
            ->middleware('permission:damages.index')
            ->name('damages.index');

        Route::get('/damage/show/{id}', 'show')
            ->middleware('permission:damages.show')
            ->name('damages.show');

    });


    // barcode
    Route::controller(BarcodePrintController::class)->group(function () {
        Route::get('/print-barcode', 'index')->middleware('permission:barcode.print')->name('barcode.print');
    });

    Route::get('/attributes', [AttributeController::class, 'index'])->middleware('permission:attributes.view')->name('attributes.index');
    Route::post('/attributes', [AttributeController::class, 'store'])->middleware('permission:attributes.create')->name('attributes.store');
    Route::put('/attributes/{attribute}', [AttributeController::class, 'update'])->middleware('permission:attributes.edit')->name('attributes.update');
    Route::delete('/attributes/{attribute}', [AttributeController::class, 'destroy'])->middleware('permission:attributes.delete')->name('attributes.destroy');

    // Attribute values routes
    Route::post('/attributes/{attribute}/values', [AttributeController::class, 'storeValue'])->middleware('permission:attributes.values.create')->name('attributes.values.store');
    Route::delete('/attributes/{attribute}/values/{value}', [AttributeController::class, 'destroyValue'])->middleware('permission:attributes.values.delete')->name('attributes.values.destroy');

    //payment routes
    Route::get('/payments', [PaymentController::class, 'index'])->middleware('permission:payments.view')->name('payments.index');
    Route::get('/ledger', [PaymentController::class, 'ledger'])->middleware('permission:payments.ledger_view')->name('payments.ledger');
    Route::get('/payments/{payment}', [PaymentController::class, 'show'])->middleware('permission:payments.view')->name('payments.show');

    // Warehouse Routes
    Route::get('/warehouses', [WarehouseController::class, 'index'])->middleware('permission:warehouse.view')->name('warehouse.list');
    Route::get('/warehouses/create', [WarehouseController::class, 'create'])->middleware('permission:warehouse.create')->name('warehouse.create');
    Route::post('/warehouses', [WarehouseController::class, 'store'])->middleware('permission:warehouse.create')->name('warehouse.store');
    Route::get('/warehouses/{warehouse}', [WarehouseController::class, 'show'])->middleware('permission:warehouse.show')->name('warehouse.show');
    Route::get('/warehouses/{warehouse}/edit', [WarehouseController::class, 'edit'])->middleware('permission:warehouse.edit')->name('warehouse.edit');
    Route::put('/warehouses/{warehouse}', [WarehouseController::class, 'update'])->middleware('permission:warehouse.update')->name('warehouse.update');
    Route::delete('/warehouses/{warehouse}', [WarehouseController::class, 'destroy'])->middleware('permission:warehouse.delete')->name('warehouse.destroy');

    // Purchase Routes
    Route::get('/purchases', [PurchaseController::class, 'index'])->middleware('permission:purchase.view')->name('purchase.list');
    Route::get('/purchases_items', [PurchaseController::class, 'allPurchasesItems'])->middleware('permission:purchase.items_view')->name('purchase.items');
    Route::get('/purchases_items/{id}', [PurchaseController::class, 'showPurchasesItem'])->middleware('permission:purchase.view')->name('purchaseItems.show');

    Route::get('/purchase/create', [PurchaseController::class, 'create'])->middleware('permission:purchase.create')->name('purchase.create');
    Route::post('/purchase/store', [PurchaseController::class, 'store'])->middleware('permission:purchase.create')->name('purchase.store');
    Route::get('/purchase/{id}', [PurchaseController::class, 'show'])->middleware('permission:purchase.show')->name('purchase.show');
    Route::patch('/purchase/{id}/payment', [PurchaseController::class, 'updatePayment'])->middleware('permission:purchase.update_payment')->name('purchase.updatePayment');
    Route::patch('/purchase/{id}/approve', [PurchaseController::class, 'approve'])->middleware('permission:purchase.approve')->name('purchase.approve');
    Route::get('/purchase/{id}/edit', [PurchaseController::class, 'edit'])->middleware('permission:purchase.edit')->name('purchase.edit');
    Route::put('/purchase/{id}', [PurchaseController::class, 'update'])->middleware('permission:purchase.edit')->name('purchase.update');
    Route::delete('/purchase/{id}', [PurchaseController::class, 'destroy'])->middleware('permission:purchase.delete')->name('purchase.destroy');
    Route::post('/toggle-user-type', [UserController::class, 'toggleUserType'])->name('user.toggle.type');

    // Add these barcode routes after your existing purchase routes
    // Barcode routes (match React calls)
    Route::post('/purchase/{purchase}/barcodes/generate', [PurchaseController::class, 'generatePurchaseBarcodes'])
        ->middleware('permission:purchase.edit')
        ->name('purchase.generate-barcodes');

    Route::get('/purchase/{purchase}/barcodes/print', [PurchaseController::class, 'printPurchaseBarcodes'])
        ->middleware('permission:purchase.view')
        ->name('purchase.print-barcodes');

    Route::post('/purchase/{purchase}/items/{item}/barcode/generate', [PurchaseController::class, 'generatePurchaseItemBarcode'])
        ->middleware('permission:purchase.edit')
        ->name('purchase.generate-item-barcode');

    Route::get('/purchase/{purchase}/items/{item}/barcode/print', [PurchaseController::class, 'printItemBarcode'])
        ->middleware('permission:purchase.view')
        ->name('purchase.print-item-barcode');


    Route::post('/toggle-user-type', [UserController::class, 'toggleUserType'])->name('user.toggle.type');

    // Route::patch('/purchases/updatePayment/{id}', [PurchaseController::class, 'updatePayment'])->middleware('permission:purchase.update_payment')->name('purchase.updatePayment');
    // Route::patch('/purchases/{id}/approve', [PurchaseController::class, 'approve'])->middleware('permission:purchase.approve')->name('purchase.approve');
    Route::get('/purchase/statistics', [PurchaseController::class, 'getStatistics'])->middleware('permission:purchase.statistics_view')->name('purchase.statistics');
    Route::get('/purchase/recent', [PurchaseController::class, 'getRecentPurchases'])->middleware('permission:purchase.recent_view')->name('purchase.recent');
    Route::get('/purchase/{id}/export-pdf', [PurchaseController::class, 'exportPdf'])->middleware('permission:purchase.export_pdf')->name('purchase.exportPdf');

    Route::get('/purchase-returns', [PurchaseReturnController::class, 'index'])
        ->middleware('permission:purchase_return.view')
        ->name('purchase-returns.list');

    Route::get('/purchase-returns/create', [PurchaseReturnController::class, 'create'])
        ->middleware('permission:purchase_return.create')
        ->name('purchase-returns.create');

    Route::post('/purchase-returns', [PurchaseReturnController::class, 'store'])
        ->middleware('permission:purchase_return.create')
        ->name('purchase-returns.store');

    Route::get('/purchase-returns/{id}', [PurchaseReturnController::class, 'show'])
        ->middleware('permission:purchase_return.show')
        ->name('purchase-returns.show');

    Route::post('/purchase-returns/{id}/approve', [PurchaseReturnController::class, 'approve'])
        ->middleware('permission:purchase_return.approve')
        ->name('purchase-returns.approve');

    Route::post('/purchase-returns/{id}/complete', [PurchaseReturnController::class, 'complete'])
        ->middleware('permission:purchase_return.complete')
        ->name('purchase-returns.complete');

    Route::delete('/purchase-returns/{id}', [PurchaseReturnController::class, 'destroy'])
        ->middleware('permission:purchase_return.delete')
        ->name('purchase-returns.destroy');


    Route::post('/switch-locale', [Controller::class, 'switchLocale'])->middleware('permission:locale.switch')->name('locale.switch');

    Route::get('/lang/{locale}', [Controller::class, 'setLang'])->middleware('permission:lang.switch')->name('lang.switch');

    Route::get('/current-lang', [Controller::class, 'getLang'])->middleware('permission:lang.current')->name('lang.current');

    Route::resource('companies', CompanyController::class)->names([
        'index' => 'companies.index',
        'create' => 'companies.create',
        'store' => 'companies.store',
        'show' => 'companies.show',
        'edit' => 'companies.edit',
        'update' => 'companies.update',
        'destroy' => 'companies.destroy',
    ])->middleware('permission:companies.view|companies.create|companies.edit|companies.delete');

    Route::resource('dealerships', DealershipController::class)->names([
        'index' => 'dealerships.index',
        'create' => 'dealerships.create',
        'store' => 'dealerships.store',
        'show' => 'dealerships.show',
        'edit' => 'dealerships.edit',
        'update' => 'dealerships.update',
        'destroy' => 'dealerships.destroy',
    ])->middleware('permission:dealerships.view|dealerships.create|dealerships.edit|dealerships.delete');

    Route::post('/dealerships/{dealership}/approve', [DealershipController::class, 'approve'])->middleware('permission:dealerships.approve')->name('dealerships.approved');

    Route::resource('plans', PlanController::class)->names([
        'index' => 'plans.index',
        'create' => 'plans.create',
        'store' => 'plans.store',
        'show' => 'plans.show',
        'edit' => 'plans.edit',
        'update' => 'plans.update',
        'destroy' => 'plans.destroy',
    ])->middleware('permission:plans.view|plans.create|plans.edit|plans.delete');

    Route::resource('subscriptions', SubscriptionController::class)->names([
        'index' => 'subscriptions.index',
        'create' => 'subscriptions.create',
        'store' => 'subscriptions.store',
        'show' => 'subscriptions.show',
        'edit' => 'subscriptions.edit',
        'update' => 'subscriptions.update',
        'destroy' => 'subscriptions.destroy',
    ])->middleware('permission:subscriptions.view|subscriptions.create|subscriptions.edit|subscriptions.delete');

    Route::get('/subscriptions/{id}/renew', [SubscriptionController::class, 'renewEdit'])
        ->middleware('permission:subscriptions.renew')->name('subscriptions.renew_edit');



    // user subscriptions controller
    Route::get('user_subscriptions/create', [UserSubscriptionsController::class, 'create'])
        ->middleware('permission:user_subscriptions.create')
        ->name('user_subscriptions.create');
    Route::get('/user_subscriptions', [UserSubscriptionsController::class, 'index'])
        ->middleware('permission:user_subscriptions.view')
        ->name('user_subscriptions.index');
    Route::get('/user_subscriptions/{id}/renew', [UserSubscriptionsController::class, 'renewEdit'])
        ->middleware('permission:user_subscriptions.renew')
        ->name('user_subscriptions.renew_edit');
    Route::get('/user_subscriptions/{id}/show', [UserSubscriptionsController::class, 'show'])
        ->middleware('permission:user_subscriptions.view')
        ->name('user_subscriptions.show');
    Route::post('/user_subscriptions', [UserSubscriptionsController::class, 'store'])
        ->middleware('permission:user_subscriptions.create')
        ->name('user_subscriptions.store');
    Route::get('/user_subscriptions/{id}', [UserSubscriptionsController::class, 'edit'])
        ->middleware('permission:user_subscriptions.edit')
        ->name('user_subscriptions.edit');
    Route::post('/user_subscriptions/{id}', [UserSubscriptionsController::class, 'renew'])
        ->middleware('permission:user_subscriptions.renew')
        ->name('user_subscriptions.renew');



    //ledger routes
    Route::get('/ledgers', [LedgerController::class, 'index'])->middleware('permission:ledger.view')->name('ledgers.index');
    Route::get('/ledgers/customer/{id?}', [LedgerController::class, 'customerLedger'])->middleware('permission:ledger.customer_view')->name('ledgers.customer');
    Route::get('/ledgers/supplier/{id?}', [LedgerController::class, 'supplierLedger'])->middleware('permission:ledger.supplier_view')->name('ledgers.supplier');
    Route::post('/ledgers/clear-due/{id}', [LedgerController::class, 'clearDueStore'])->middleware('permission:ledger.clear_due')->name('clearDue.store');
    Route::post('/ledgers/advance-payment/{id}', [LedgerController::class, 'advancePaymentStore'])->middleware('permission:ledger.advance_payment')->name('advancePayment.store');
    Route::get('/product-ledger', [LedgerController::class, 'ProductLedger'])
        ->middleware('permission:ledger.product_view')
        ->name('product-ledger.index');


    Route::post('/subscriptions/{subscription}/renew', [SubscriptionController::class, 'renew'])->middleware('permission:subscriptions.renew')->name('subscriptions.renew');
    Route::get('/subscriptions_payments', [SubscriptionController::class, 'payment'])->middleware('permission:subscriptions.payments_view')->name('subscriptions.payments');
    Route::get('/subscriptions_payments/view/{id}', [SubscriptionController::class, 'paymentView'])->middleware('permission:subscriptions.payments_view')->name('subscriptions.payments.view');

    // Attendance routes
    Route::prefix('attendance')->group(function () {
        Route::get('/', [AttendanceController::class, 'index'])->middleware('permission:attendance.view')->name('attendance.index');
        Route::post('/check-in', [AttendanceController::class, 'checkIn'])->middleware('permission:attendance.checkin')->name('attendance.checkin');
        Route::post('/check-out', [AttendanceController::class, 'checkOut'])->middleware('permission:attendance.checkout')->name('attendance.checkout');
        Route::post('/resume-shift', [AttendanceController::class, 'resumeShift'])->middleware('permission:attendance.checkin')->name('attendance.resume-shift');
        Route::post('/manual-entry', [AttendanceController::class, 'manualEntry'])->middleware('permission:attendance.manual_entry')->name('attendance.manual-entry');
        Route::get('/monthly-report', [AttendanceController::class, 'monthlyReport'])->middleware('permission:attendance.monthly_report')->name('attendance.monthly-report');
        Route::get('/top-performers', [AttendanceController::class, 'topPerformers'])->middleware('permission:attendance.top_performers')->name('attendance.top-performers');
        Route::post('/early-out', [AttendanceController::class, 'earlyOut'])->middleware('permission:attendance.early_out')->name('attendance.early-out');
        Route::get('/manual-entry', [AttendanceController::class, 'manualEntryForm'])->middleware('permission:attendance.manual_entry')->name('attendance.manual-form');
        Route::post('/manual-entry', [AttendanceController::class, 'manualEntry'])->middleware('permission:attendance.manual_entry')->name('attendance.manual-entry');
    });

    // Test Salary routes
    Route::prefix('salary')->group(function () {
        Route::get('/test-create', [SalaryController::class, 'testCreateForm'])->middleware('permission:salary.test_form')->name('salary.test-form');
        Route::post('/test-create', [SalaryController::class, 'calculateTestSalary'])->middleware('permission:salary.test_create')->name('salary.test-create');
    });

    Route::get('/employee-salary-advances', [EmployeeSalaryAdvanceController::class, 'index'])
    ->name('employee-salary-advances.index');

Route::post('/employee-salary-advances', [EmployeeSalaryAdvanceController::class, 'store'])
    ->name('employee-salary-advances.store');

    // Salary Routes
    Route::prefix('salary')->name('salary.')->group(function () {
        Route::get('/', [SalaryController::class, 'index'])->middleware('permission:salary.view')->name('index');
        Route::post('/calculate', [SalaryController::class, 'calculateSalary'])->middleware('permission:salary.calculate')->name('calculate');
        Route::post('/{salary}/pay', [SalaryController::class, 'paySalary'])->middleware('permission:salary.pay')->name('pay');
        Route::get('/{salary}/payslip', [SalaryController::class, 'payslip'])->middleware('permission:salary.payslip')->name('payslip');
        Route::get('/report', [SalaryController::class, 'report'])->middleware('permission:salary.report')->name('report');
        Route::delete('/{salary}', [SalaryController::class, 'destroy'])->middleware('permission:salary.delete')->name('destroy');
        Route::post('/bulk-action', [SalaryController::class, 'bulkAction'])->middleware('permission:salary.bulk_action')->name('bulk-action');
    });

    // Leave Routes
    Route::prefix('leave')->name('leave.')->group(function () {
        Route::get('/', [LeaveController::class, 'index'])->middleware('permission:leave.view')->name('index');
        Route::get('/create', [LeaveController::class, 'create'])->middleware('permission:leave.create')->name('create');
        Route::post('/', [LeaveController::class, 'store'])->middleware('permission:leave.store')->name('store');
        Route::get('/{leave}', [LeaveController::class, 'show'])->middleware('permission:leave.show')->name('show');
        Route::post('/{leave}/approve', [LeaveController::class, 'approve'])->middleware('permission:leave.approve')->name('approve');
        Route::post('/{leave}/reject', [LeaveController::class, 'reject'])->middleware('permission:leave.reject')->name('reject');
        Route::post('/{leave}/cancel', [LeaveController::class, 'cancel'])->middleware('permission:leave.cancel')->name('cancel');
        Route::delete('/{leave}', [LeaveController::class, 'destroy'])->middleware('permission:leave.delete')->name('destroy');
        Route::get('/balance/{employee}', [LeaveController::class, 'balance'])->middleware('permission:leave.balance_view')->name('balance');
        Route::get('/dashboard', [LeaveController::class, 'dashboard'])->middleware('permission:leave.dashboard_view')->name('dashboard');
    });

    // Provident Fund Routes
    Route::prefix('provident-fund')->group(function () {
        Route::get('/', [ProvidentFundController::class, 'index'])->middleware('permission:provident_fund.view')->name('provident-fund.index');
        Route::get('/summary', [ProvidentFundController::class, 'overallSummary'])->middleware('permission:provident_fund.summary_view')->name('provident-fund.summary');
        Route::get('/{user}/statement', [ProvidentFundController::class, 'employeeStatement'])->middleware('permission:provident_fund.statement_view')->name('provident-fund.statement');
        Route::post('/{user}/update-percentage', [ProvidentFundController::class, 'updatePfPercentage'])->middleware('permission:provident_fund.update_percentage')->name('provident-fund.update-percentage');
    });

    // Allowance Routes
    Route::prefix('allowances')->group(function () {
        Route::get('/', [AllowanceController::class, 'index'])->middleware('permission:allowances.view')->name('allowances.index');
        Route::post('/', [AllowanceController::class, 'store'])->middleware('permission:allowances.create')->name('allowances.store');
        Route::put('/{allowanceSetting}', [AllowanceController::class, 'update'])->middleware('permission:allowances.update')->name('allowances.update');
        Route::post('/apply-settings', [AllowanceController::class, 'applyAllowanceSettings'])->middleware('permission:allowances.apply_settings')->name('allowances.apply-settings');
        Route::post('/{user}/update', [AllowanceController::class, 'updateUserAllowances'])->middleware('permission:allowances.update_user')->name('allowances.update-user');
    });

    // Rank Routes
    Route::prefix('ranks')->group(function () {
        Route::get('/', [RankController::class, 'index'])->middleware('permission:ranks.view')->name('ranks.index');
        Route::post('/', [RankController::class, 'store'])->middleware('permission:ranks.create')->name('ranks.store');
        Route::put('/{rank}', [RankController::class, 'update'])->middleware('permission:ranks.update')->name('ranks.update');
        Route::delete('/{rank}', [RankController::class, 'destroy'])->middleware('permission:ranks.delete')->name('ranks.destroy');
        Route::get('/{rank}/users', [RankController::class, 'getRankUsers'])->middleware('permission:ranks.users_view')->name('ranks.users');
        Route::post('/{user}/promote', [RankController::class, 'promoteUser'])->middleware('permission:ranks.promote_user')->name('ranks.promote-user');
    });

    // Award Routes
    Route::resource('awards', AwardController::class)->middleware('permission:awards.view|awards.create|awards.edit|awards.delete');
    Route::post('/awards/assign-monthly', [AwardController::class, 'assignMonthlyAwards'])->middleware('permission:awards.assign_monthly')->name('awards.assign-monthly');
    Route::post('/awards/assign-to-employee', [AwardController::class, 'assignAwardToEmployee'])->middleware('permission:awards.assign_to_employee')->name('awards.assign-to-employee');
    Route::get('/awards/employee-awards', [AwardController::class, 'employeeAwards'])->middleware('permission:awards.employee_awards_view')->name('awards.employee-awards');

    Route::post('/awards/{employeeAward}/mark-paid', [AwardController::class, 'markAsPaid'])->middleware('permission:awards.mark_paid')->name('awards.mark-paid');
    Route::post('/awards/{employeeAward}/mark-unpaid', [AwardController::class, 'markAsUnpaid'])->middleware('permission:awards.mark_unpaid')->name('awards.mark-unpaid');
    Route::delete('/awards/employee-awards/{employeeAward}', [AwardController::class, 'destroyEmployeeAward'])->middleware('permission:awards.destroy_employee_award')->name('awards.destroy-employee-award');
    Route::get('/awards/statistics', [AwardController::class, 'awardStatistics'])->middleware('permission:awards.statistics_view')->name('awards.statistics');
    Route::post('/salary/process-award-payments', [SalaryController::class, 'processAwardPayments'])->middleware('permission:salary.process_award_payments')->name('salary.process-award-payments');

    // User Management
    Route::prefix('employees')->group(function () {
        Route::get('/', [EmployeeController::class, 'index'])->middleware('permission:employees.view')->name('employees.index');
        Route::post('/', [EmployeeController::class, 'store'])->middleware('permission:employees.create')->name('employees.store');
        Route::get('/{user}/edit', [EmployeeController::class, 'edit'])->middleware('permission:employees.edit')->name('employees.edit');
        Route::put('/{user}', [EmployeeController::class, 'update'])->middleware('permission:employees.update')->name('employees.update');
        Route::delete('/{user}', [EmployeeController::class, 'destroy'])->middleware('permission:employees.delete')->name('employees.destroy');
        Route::post('/{user}/password', [EmployeeController::class, 'updatePassword'])->middleware('permission:employees.update_password')->name('employees.update-password');
        Route::post('/{user}/salary', [EmployeeController::class, 'updateSalary'])->middleware('permission:employees.update_salary')->name('employees.update-salary');
    });

    Route::resource('bonus', BonusSettingController::class)->middleware('permission:bonus.view|bonus.create|bonus.edit|bonus.delete');
    Route::get('/bonus/{bonus}/apply', [BonusSettingController::class, 'showApplyForm'])->middleware('permission:bonus.apply_form')->name('bonus.apply-form');
    Route::post('/bonus/{bonus}/apply', [BonusSettingController::class, 'applyBonus'])->middleware('permission:bonus.apply')->name('bonus.apply');
    Route::post('/bonus/apply-eid', [BonusSettingController::class, 'applyEidBonus'])->middleware('permission:bonus.apply_eid')->name('bonus.apply-eid');
    Route::post('/bonus/apply-festival', [BonusSettingController::class, 'applyFestivalBonus'])->middleware('permission:bonus.apply_festival')->name('bonus.apply-festival');

    Route::resource('brands', BrandController::class)->names([
        'index' => 'brands.index',
        'create' => 'brands.create',
        'store' => 'brands.store',
        'show' => 'brands.show',
        'edit' => 'brands.edit',
        'update' => 'brands.update',
        'destroy' => 'brands.destroy',
    ])->middleware('permission:brands.view|brands.create|brands.edit|brands.delete');

    // Roles Routes with permissions
    Route::prefix('roles')->name('roles.')->group(function () {
        Route::get('/', [RoleController::class, 'index'])
            ->middleware('permission:roles.view')
            ->name('index');

        Route::get('/create', [RoleController::class, 'create'])
            ->middleware('permission:roles.create')
            ->name('create');

        Route::post('/', [RoleController::class, 'store'])
            ->middleware('permission:roles.create')
            ->name('store');

        Route::get('/{role}', [RoleController::class, 'show'])
            ->middleware('permission:roles.show')
            ->name('show');

        Route::get('/{role}/edit', [RoleController::class, 'edit'])
            ->middleware('permission:roles.edit')
            ->name('edit');

        Route::put('/{role}', [RoleController::class, 'update'])
            ->middleware('permission:roles.edit')
            ->name('update');

        Route::delete('/{role}', [RoleController::class, 'destroy'])
            ->middleware('permission:roles.delete')
            ->name('destroy');
    });

    Route::get('/sms-test', function () {
        return Inertia::render('Sms/Test');
    })->name('sms.test.page');

    // API রাউট (পূর্বে যোগ করা)
    Route::post('/sms/test', [SupplierController::class, 'sendTestSms'])->name('sms.test');
    Route::post('/sms/preview', [SupplierController::class, 'getSmsPreview'])->name('sms.preview');


    Route::resource('sms-templates', SmsTemplateController::class)
        ->middleware('permission:sms_templates.view|sms_templates.create|sms_templates.edit|sms_templates.delete');

    Route::post('/sms-templates/{smsTemplate}/toggle-status', [SmsTemplateController::class, 'toggleStatus'])
        ->middleware('permission:sms_templates.toggle_status')
        ->name('sms-templates.toggle-status');


    Route::get('/purchases_local_product', [PurchaseController::class, 'list_index'])
        ->middleware('permission:purchase.list_index')
        ->name('purchase.list_index');


    // All reports route will be here 
    Route::controller(ReportController::class)->prefix('reports')->group(function () {
        Route::get('/sales', 'salesReport')
            ->name('reports.sales');
        Route::get('/sales/export', 'exportSalesReport')
            ->name('reports.sales.export');


        Route::get('/sales/items', 'salesItemReport')
            ->name('reports.sales.items');
        Route::get('/sales/items/export', 'exportSalesItemReport')
            ->name('reports.sales-items.export');


        Route::get('/purchases', 'purchaseReport')
            ->name('reports.purchase');
        Route::get('/purchases/export', 'exportPurchaseReport')
            ->name('reports.purchase.export');


        Route::get('/purchases/items', 'purchaseItemsReport')
            ->name('reports.purchase.items');
        Route::get('/purchases/items/export', 'exportPurchaseItemsReport')
            ->name('reports.purchase-items.export');


        Route::get('/customer', 'customerReport')
            ->name('reports.customer');
        Route::get('/customer/export', 'exportCustomerReport')
            ->name('reports.customer.export');


        Route::get('/supplier', 'supplierReport')
            ->name('reports.supplier');
        Route::get('/supplier/export', 'exportSupplierReport')
            ->name('reports.supplier.export');


        Route::get('/transaction', 'transactionReport')
            ->name('reports.transaction');
        Route::get('/transaction/export', 'exportTransactionReport')
            ->name('reports.transaction.export');


        Route::get('/account', 'accountReport')
            ->name('reports.account');
        Route::get('/reports/account/export', 'exportAccountReport')
            ->name('reports.account.export');


        Route::get('/expense', 'expenseReport')
            ->name('reports.expense');
        Route::get('/reports/expense/export', 'exportExpenseReport')
            ->name('reports.expense.export');


        Route::get('/product', 'productReport')
            ->name('reports.product');
        Route::get('/reports/product/export', 'exportProductReport')
            ->name('reports.product.export');


        Route::get('/sales-return', 'salesReturnReport')
            ->name('reports.sales-return');
        Route::get('/reports/sales-return/export', 'exportSalesReturnsReport')
            ->name('reports.sales-return.export');


        Route::get('/purchase-return', 'purchaseReturnReport')
            ->name('reports.purchase-return');
        Route::get('/reports/purchase-return/export', 'exportPurchaseReturnsReport')
            ->name('reports.purchase-return.export');

        Route::get('/damages', 'damageReport')
            ->name('reports.damage');
    });



    // Investors
    Route::get('/investors', [InvestorController::class, 'index'])
        ->name('investors.index')->middleware('permission:investors.view');
    Route::get('/investors/create', [InvestorController::class, 'create'])
        ->name('investors.create')->middleware('permission:investors.create');
    Route::post('/investors', [InvestorController::class, 'store'])
        ->name('investors.store')->middleware('permission:investors.create');
    Route::get('/investors/{investor}/edit', [InvestorController::class, 'edit'])
        ->name('investors.edit')->middleware('permission:investors.edit');
    Route::put('/investors/{investor}', [InvestorController::class, 'update'])
        ->name('investors.update')->middleware('permission:investors.edit');
    Route::delete('/investors/{investor}', [InvestorController::class, 'destroy'])
        ->name('investors.destroy')->middleware('permission:investors.delete');

    // Investments
    Route::get('/investments', [InvestmentController::class, 'index'])
        ->name('investments.index')->middleware('permission:investments.view');
    Route::get('/investments/create', [InvestmentController::class, 'create'])
        ->name('investments.create')->middleware('permission:investments.create');
    Route::post('/investments', [InvestmentController::class, 'store'])
        ->name('investments.store')->middleware('permission:investments.create');
    Route::get('/investments/{investment}', [InvestmentController::class, 'show'])
        ->name('investments.show')->middleware('permission:investments.view');
    Route::get('/investments/{investment}/edit', [InvestmentController::class, 'edit'])
        ->name('investments.edit')->middleware('permission:investments.edit');
    Route::put('/investments/{investment}', [InvestmentController::class, 'update'])
        ->name('investments.update')->middleware('permission:investments.edit');
    Route::delete('/investments/{investment}', [InvestmentController::class, 'destroy'])
        ->name('investments.destroy')->middleware('permission:investments.delete');

    // Withdrawal (mid-term)
    Route::post('/investments/{investment}/withdraw', [InvestmentController::class, 'withdraw'])
        ->name('investments.withdraw')->middleware('permission:investments.withdraw');

    // Returns list + mark paid (optional for step-2 UI)
    Route::get('/investment-returns', [InvestmentReturnController::class, 'index'])
        ->name('investmentReturns.index')->middleware('permission:investments.returns.view');

    Route::post('/investment-returns/{investmentReturn}/mark-paid', [InvestmentReturnController::class, 'markPaid'])
        ->name('investmentReturns.markPaid')->middleware('permission:investments.returns.mark_paid');

    Route::resource('borrowers', BorrowerController::class)->except(['create', 'edit']);

    Route::prefix('loans')->group(function () {
        Route::get('/', [LoanController::class, 'index'])
            ->name('loans.index')->middleware('permission:loans.view');

        Route::post('/', [LoanController::class, 'store'])
            ->name('loans.store')->middleware('permission:loans.create');

        Route::put('/{loan}', [LoanController::class, 'update'])
            ->name('loans.update')->middleware('permission:loans.edit');

        Route::delete('/{loan}', [LoanController::class, 'destroy'])
            ->name('loans.destroy')->middleware('permission:loans.delete');

        Route::get('/{loan}', [LoanController::class, 'show'])
            ->name('loans.show')->middleware('permission:loans.view');

        Route::post('/{loan}/approve', [LoanController::class, 'approve'])
            ->name('loans.approve')->middleware('permission:loans.approve');

        Route::post('/{loan}/reject', [LoanController::class, 'reject'])
            ->name('loans.reject')->middleware('permission:loans.reject');

        Route::post('/{loan}/disburse', [LoanController::class, 'disburse'])
            ->name('loans.disburse')->middleware('permission:loans.disburse');

        Route::post('/{loan}/close', [LoanController::class, 'close'])
            ->name('loans.close')->middleware('permission:loans.close');
    });

    Route::resource('shops', ShopController::class)->except(['create', 'edit', 'show']);
    Route::get('/pickup-holds', [PickupHoldController::class, 'index'])->name('pickup-holds.index');
    Route::get('/pickup-holds/create', [PickupHoldController::class, 'create'])->name('pickup-holds.create');
    Route::post('/pickup-holds', [PickupHoldController::class, 'store'])->name('pickup-holds.store');
    Route::get('/pickup-holds/{pickupHold}', [PickupHoldController::class, 'show'])->name('pickup-holds.show');
    Route::post('/pickup-hold-items/{item}/return', [PickupHoldController::class, 'returnItem'])->name('pickup-hold-items.return');
    Route::post('/pickup-hold-items/{item}/sold', [PickupHoldController::class, 'soldItem'])->name('pickup-hold-items.sold');

    Route::prefix('loan-repayments')->group(function () {
        Route::get('/', [LoanRepaymentController::class, 'index'])
            ->name('loanRepayments.index')->middleware('permission:loans.repayments.view');

        Route::post('/collect', [LoanRepaymentController::class, 'collect'])
            ->name('loanRepayments.collect')->middleware('permission:loans.repayments.collect');
    });


    // Headers
    Route::resource('headers', HeaderController::class)
        ->middleware('permission:headers.index|headers.create|headers.edit|headers.delete|headers.show');


    //System route will be here
    Route::get('/system', [SystemController::class, 'index'])
        ->middleware('permission:system.index')
        ->name('system.index');

    Route::put('/systems/{id}', [SystemController::class, 'update'])
        ->middleware('permission:system.edit')
        ->name('systems.update');


    //notifications
    Route::get('/notifications', [NotificationController::class, 'index'])
        ->middleware('permission:notifications.view')
        ->name('notifications.index');

    Route::put('/notifications/{notification}/mark-as-read', [NotificationController::class, 'markAsRead'])
        ->middleware('permission:notifications.read')
        ->name('notifications.markAsRead');

    Route::put('/notifications/mark-all-as-read', [NotificationController::class, 'markAllAsRead'])
        ->middleware('permission:notifications.read_all')
        ->name('notifications.markAllAsRead');

    Route::delete('/notifications/delete-all-read', [NotificationController::class, 'deleteAllRead'])
        ->middleware('permission:notifications.delete_all')
        ->name('notifications.deleteAllRead');

    Route::delete('/notifications/{notification}', [NotificationController::class, 'delete'])
        ->middleware('permission:notifications.delete')
        ->name('notifications.destroy');


});





Route::post('/switch-locale', [Controller::class, 'switchLocale'])->name('locale.switch');
Route::get('/lang/{locale}', [Controller::class, 'setLang'])
    ->middleware('permission:locale.switch')->name('lang.switch');
Route::get('/current-lang', [Controller::class, 'getLang'])
    ->middleware('permission:lang.current')->name('lang.current');

Route::get('/storage-link', function () {
    Artisan::call('storage:link');
    return 'Storage link created successfully';
});

require __DIR__ . '/command.php';
