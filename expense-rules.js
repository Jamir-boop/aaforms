(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.ExpenseRules = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const FX_TO_USD = Object.freeze({
        USD: 1,
        COP: 0.00025,
        EUR: 1.08,
        GBP: 1.27
    });
    const HARD_CAP_USD = 10000;
    const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;
    const RESTRICTED_PURPOSE = /\b(personal|gift card|cash advance|cryptocurrency|crypto|fine|penalty|political donation)\b/i;

    function evaluate(request, profile, priorRequests, now) {
        const amount = Number(request.amount);
        const currency = String(request.currency || '').toUpperCase();
        const purpose = String(request.purpose || '').trim();
        const rate = FX_TO_USD[currency];

        if (!Number.isFinite(amount) || amount <= 0) throw new Error('invalidAmount');
        if (!rate) throw new Error('unsupportedCurrency');
        if (purpose.length < 10) throw new Error('shortPurpose');

        const amountUsd = Math.round(amount * rate * 100) / 100;
        const normalizedPurpose = purpose.toLowerCase().replace(/\s+/g, ' ');
        const duplicate = (priorRequests || []).some(function (item) {
            return item.status === 'approved' &&
                item.requesterPhone === request.requesterPhone &&
                item.currency === currency &&
                Number(item.amount) === amount &&
                String(item.purpose).toLowerCase().replace(/\s+/g, ' ') === normalizedPurpose &&
                new Date(now).getTime() - new Date(item.createdAt).getTime() <= DUPLICATE_WINDOW_MS;
        });

        const checks = [
            {
                code: 'policy',
                passed: !RESTRICTED_PURPOSE.test(purpose),
                failureCode: 'restricted'
            },
            {
                code: 'duplicate',
                passed: !duplicate,
                failureCode: 'duplicate'
            },
            {
                code: 'companyCap',
                passed: amountUsd <= HARD_CAP_USD,
                failureCode: 'companyCap',
                params: { limit: HARD_CAP_USD }
            },
            {
                code: 'departmentLimit',
                passed: amountUsd <= profile.autoApprovalLimitUsd,
                failureCode: 'departmentLimit',
                params: {
                    departmentKey: profile.departmentKey,
                    limit: profile.autoApprovalLimitUsd
                }
            },
            {
                code: 'monthlyBudget',
                passed: amountUsd <= profile.remainingBudgetUsd,
                failureCode: 'monthlyBudget',
                params: { limit: profile.remainingBudgetUsd }
            }
        ];
        const failed = checks.find(function (check) { return !check.passed; });

        return {
            status: failed ? 'rejected' : 'approved',
            reasonCode: failed ? failed.failureCode : 'approved',
            reasonParams: failed ? failed.params || {} : {},
            amountUsd: amountUsd,
            checks: checks.map(function (check) {
                return { code: check.code, passed: check.passed, params: check.params || {} };
            })
        };
    }

    return {
        evaluate: evaluate,
        supportedCurrencies: Object.keys(FX_TO_USD)
    };
}));

if (typeof module === 'object' && module.exports && require.main === module) {
    const assert = require('node:assert/strict');
    const rules = module.exports;
    const profile = {
        departmentKey: 'sales',
        autoApprovalLimitUsd: 1500,
        remainingBudgetUsd: 4200
    };
    const base = {
        requesterPhone: '+573001234567',
        amount: 120,
        currency: 'USD',
        purpose: 'Client dinner for renewal meeting'
    };

    assert.equal(rules.evaluate(base, profile, [], new Date()).status, 'approved');
    assert.equal(rules.evaluate({ ...base, amount: 1800 }, profile, [], new Date()).status, 'rejected');
    assert.equal(rules.evaluate({ ...base, purpose: 'Personal gift card purchase' }, profile, [], new Date()).status, 'rejected');
    console.log('Expense rules self-check passed.');
}
