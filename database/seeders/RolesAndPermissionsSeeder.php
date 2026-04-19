<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Module;
use App\Models\Supplier;
use App\Models\System;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run()
    {
        // Clear cached roles & permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // ========== ALL PERMISSIONS ==========
        $permissions = [

            // Dashboard
            'dashboard.view',
            'sales_return.pickup',
            'locale.switch',

            // Installments
            'installments.view',
            'installments.edit',

            'purchase.list_index',

            // Damages
            'damages.create',
            'damages.store',
            'damages.index',
            'damages.show',

            'headers.edit',
            'headers.index',
            'headers.create',
            'headers.delete',
            'headers.show',

            // Users
            'users.view',
            'users.create',
            'users.edit',
            'users.delete',
            'users.active',
            'users.hold',


            // Customers
            'customer.view',
            'customer.create',
            'customer.edit',
            'customer.delete',
            'customer.show',

            // Investors
            'investors.view',
            'investors.create',
            'investors.edit',
            'investors.delete',

            // Investments
            'investments.view',
            'investments.create',
            'investments.edit',
            'investments.delete',
            'investments.withdraw',
            'investments.returns.view',
            'investments.returns.mark_paid',

            // Categories
            'category.view',
            'category.create',
            'category.edit',
            'category.delete',

            // Suppliers
            'supplier.view',
            'supplier.create',
            'supplier.edit',
            'supplier.delete',
            'supplier.show',

            // Products
            'product.view',
            'product.create',
            'product.edit',
            'product.delete',

            // Brands
            'brands.view',
            'brands.create',
            'brands.edit',
            'brands.delete',
            'brands.show',

            // Roles
            'roles.view',
            'roles.create',
            'roles.edit',
            'roles.delete',
            'roles.show',

            // Sales
            'sales.view',
            'sales.create',
            'sales.edit',
            'sales.delete',
            'sales.print',
            'sales.download_pdf',
            'sales.items.view',
            'sales.items.delete',
            'sales.payments.create',
            'sales.update',
            'sales.rejected',

            // sales return
            'salesReturn.list',
            'return.create',
            'return.store',
            'salesReturn.show',
            'salesReturn.destroy',
            'salesReturn.edit',
            'salesReturn.update',
            'return.approve',


            // Sales List
            'sales_list.view',
            'sales_list.delete',
            'sales_list.status_update',
            'sales_list.due_collect',

            // Expenses
            'expense.view',
            'expense.create',
            'expense.delete',
            'expense.category_view',
            'expense.category_create',

            // Extra Cash
            'extra_cash.view',
            'extra_cash.create',
            'extra_cash.delete',

            // Profile
            'profile.view',
            'profile.update',
            'security.view',
            'security.update',

            // Barcode
            'barcode.print',

            // Attributes
            'attributes.view',
            'attributes.create',
            'attributes.edit',
            'attributes.delete',
            'attributes.values.create',
            'attributes.values.delete',

            // Payments & Ledger
            'payments.view',
            'payments.ledger_view',
            'payments.show',
            'ledger.view',
            'ledger.customer_view',
            'ledger.supplier_view',
            'ledger.clear_due',
            'ledger.advance_payment',

            // Warehouse
            'warehouse.view',
            'warehouse.create',
            'warehouse.show',
            'warehouse.edit',
            'warehouse.update',
            'warehouse.delete',

            // Purchase
            'purchase.view',
            'purchase.create',
            'purchase.show',
            'purchase.edit',
            'purchase.update',
            'purchase.delete',
            'purchase.update_payment',
            'purchase.approve',
            'purchase.items_view',
            'purchase.statistics_view',
            'purchase.recent_view',
            'purchase.export_pdf',

            // Purchase Return
            'purchase_return.view',
            'purchase_return.create',
            'purchase_return.show',
            'purchase_return.edit',
            'purchase_return.update',
            'purchase_return.delete',
            'purchase_return.approve',
            'purchase_return.complete',

            // Companies
            'companies.view',
            'companies.create',
            'companies.show',
            'companies.edit',
            'companies.update',
            'companies.delete',

            // Dealerships
            'dealerships.view',
            'dealerships.create',
            'dealerships.show',
            'dealerships.edit',
            'dealerships.update',
            'dealerships.delete',
            'dealerships.approve',

            // Plans
            'plans.view',
            'plans.create',
            'plans.show',
            'plans.edit',
            'plans.update',
            'plans.delete',

            // Subscriptions
            'subscriptions.view',
            'subscriptions.create',
            'subscriptions.show',
            'subscriptions.edit',
            'subscriptions.update',
            'subscriptions.delete',
            'subscriptions.renew',
            'subscriptions.payments_view',

            // Attendance
            'attendance.view',
            'attendance.create',
            'attendance.edit',
            'attendance.delete',
            'attendance.checkin',
            'attendance.checkout',
            'attendance.manual_entry',
            'attendance.monthly_report',
            'attendance.top_performers',
            'attendance.early_out',

            // Salary
            'salary.view',
            'salary.create',
            'salary.edit',
            'salary.delete',
            'salary.calculate',
            'salary.pay',
            'salary.payslip',
            'salary.report',
            'salary.bulk_action',
            'salary.test_form',
            'salary.test_create',
            'salary.process_award_payments',

            // Leave
            'leave.view',
            'leave.create',
            'leave.edit',
            'leave.delete',
            'leave.store',
            'leave.show',
            'leave.approve',
            'leave.reject',
            'leave.cancel',
            'leave.balance_view',
            'leave.dashboard_view',

            // Provident Fund
            'provident_fund.view',
            'provident_fund.create',
            'provident_fund.edit',
            'provident_fund.delete',
            'provident_fund.summary_view',
            'provident_fund.statement_view',
            'provident_fund.update_percentage',

            // Allowances
            'allowances.view',
            'allowances.create',
            'allowances.edit',
            'allowances.delete',
            'allowances.update',
            'allowances.apply_settings',
            'allowances.update_user',

            // Ranks
            'ranks.view',
            'ranks.create',
            'ranks.edit',
            'ranks.delete',
            'ranks.update',
            'ranks.users_view',
            'ranks.promote_user',

            // Awards
            'awards.view',
            'awards.create',
            'awards.edit',
            'awards.delete',
            'awards.update',
            'awards.show',
            'awards.assign_monthly',
            'awards.assign_to_employee',
            'awards.employee_awards_view',
            'awards.mark_paid',
            'awards.mark_unpaid',
            'awards.destroy_employee_award',
            'awards.statistics_view',

            // Employees
            'employees.view',
            'employees.create',
            'employees.edit',
            'employees.delete',
            'employees.update',
            'employees.update_password',
            'employees.update_salary',

            // Bonus
            'bonus.view',
            'bonus.create',
            'bonus.edit',
            'bonus.delete',
            'bonus.update',
            'bonus.show',
            'bonus.apply_form',
            'bonus.apply',
            'bonus.apply_eid',
            'bonus.apply_festival',


            // Exchange
            'exchange.view',
            'exchange.create',
            'exchange.edit',
            'exchange.delete',

            // PDF
            'pdf.download',
            'pdf.view',
            'lang.switch',
            'lang.current',

            // Outlets
            'outlets.view',
            'outlets.create',
            'outlets.edit',
            'outlets.delete',
            'outlets.show',
            'outlets.login',
            'outlets.logout',
            'outlets.switch',

            // Accounts
            'accounts.view',
            'accounts.create',
            'accounts.edit',
            'accounts.delete',
            'accounts.show',
            'accounts.deposit',
            'accounts.withdraw',
            'accounts.transfer',

            // Deposits
            'deposits.view',
            'deposits.create',
            'deposits.edit',
            'deposits.delete',
            'deposits.show',
            'deposits.approve',
            'deposits.reject',

            // Sales Return
            'sales_return.view',
            'sales_return.create',
            'sales_return.edit',
            'sales_return.delete',
            'sales_return.show',

            //system 
            'system.index',
            'system.edit',

            // SMS
            'sms_templates.view',
            'sms_templates.create',
            'sms_templates.edit',
            'sms_templates.delete',
            'sms_templates.show',
            'sms_templates.toggle_status',

            'sales.scan-barcode',
            'salesShadow.store',
            'sms.test.page',
            'sales.print.request',
            'product_ledger.view',
            'sales.items.destroy',

            'business_profile.view',
            'business_profile.edit',

            'profile.edit',

            'sales_return.delete',
            'return.delete',

            'ledger.product_view',

            'notifications.view',
            'notifications.read',
            'notifications.read_all',
            'notifications.delete_all',
            'notifications.delete',

            // user subscriptions
            'user_subscriptions.create',
            'user_subscriptions.view',
            'user_subscriptions.renew',
            'user_subscriptions.edit',

            'loans.view',
            'loans.create',
            'loans.edit',
            'loans.delete',
            'loans.approve',
            'loans.reject',
            'loans.disburse',
            'loans.close',
            'loans.repayments.view',
            'loans.repayments.collect',

            'borrowers.view',
            'borrowers.create',
            'borrowers.edit',
            'borrowers.delete',
        ];


        foreach ($permissions as $permission) {
            Permission::updateOrCreate(['name' => $permission]);
        }

        // ========== ROLES ==========
        $superAdmin = Role::updateOrCreate(['name' => 'Super Admin']);

        $admin = Role::updateOrCreate(['name' => 'Admin']);

        $excluded = [
            // Plans
            'plans.view',
            'plans.create',
            'plans.show',
            'plans.edit',
            'plans.update',
            'plans.delete',

            // Subscriptions
            'subscriptions.view',
            'subscriptions.create',
            'subscriptions.show',
            'subscriptions.edit',
            'subscriptions.update',
            'subscriptions.delete',
            'subscriptions.renew',
            'subscriptions.payments_view',

            // Modules
            'modules.view',
            'modules.create',
            'modules.edit',
            'modules.delete',
            'modules.update',
            'modules.show',

            // User Deposit 
            'deposits.approve',
            'deposits.reject',
            'users.active',
            'users.hold',


            //system 
            'system.index',
            'system.edit',
        ];

        $superAdmin->syncPermissions(Permission::all());


        $admin->syncPermissions(
            Permission::whereNotIn('name', $excluded)->get()
        );

        // ========== USERS ==========
        $superAdminUser = User::updateOrCreate(
            ['email' => 'superadmin@system.com'],
            [
                'name' => 'Super Admin',
                'role_id' => User::SUPERADMIN_ROLE,
                'password' => bcrypt('password123'),
                'email_verified_at' => now(),
                'role' => 'superadmin',
            ]
        );

        $superAdminUser->syncRoles(['Super Admin']);


        $adminUser = User::updateOrCreate(
            ['email' => 'admin@system.com'],
            [
                'name' => 'Admin User',
                'role_id' => User::ADMIN_ROLE,
                'password' => bcrypt('password123'),
                'email_verified_at' => now(),
                'role' => 'admin',
            ]
        );


        $adminUser->syncRoles(['Admin']);


        // === Supplier Create ======

        Supplier::updateOrCreate(
            ['email' => 'pickup@mail.com'],
            [
                'name' => 'Supplier Pick Up',
                'contact_person' => 'Supplier User',
                'email' => 'pickup@mail.com',
                'phone' => '0123456789',
                'company' => 'Pickup Supplier',
                'address' => 'N/A',
                'advance_amount' => 0,
                'due_amount' => 0,
                'is_active' => 1,
                'created_by' => Auth::id() ?? 1,
                'outlet_id' => 1 ?? null,
                'dealership_id' => null,
            ]
        );

        // === Customer Create ======
        Customer::updateOrCreate(
            ['phone' => '100100100'],
            [
                'customer_name' => 'walk-in-customer',
                'address' => 'N/A',
                'phone' => '100100100',
                'is_active' => 1,
                'advance_amount' => 0,
                'due_amount' => 0,
                'created_by' => Auth::id() ?? 1,
                'outlet_id' => 1 ?? null,
            ]
        );


        // === System Create ======
        System::updateOrCreate(
            ['id' => 1],
            [
                'status' => 'active',
                'hold_reason' => 'Right Now System is on Maintenance | ' . now() . ' Contact With System Admin',
            ]
        );

        // === module Crate == //
        Module::updateOrCreate(
            ['id' => 1],
            [
                'name' => 'All Modules',
                'is_active' => 1,
                'description' => 'All Modules will be accessible',
            ]
        );





        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }
}
