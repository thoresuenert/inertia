<?php

namespace App\Support\InertiaScope;

use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Redirector;
use Illuminate\Support\ServiceProvider;
use InvalidArgumentException;

/**
 * Redirect macros of the Router Scopes protocol: S4 withScopeTarget()
 * (flash an explicit target for the next scoped response) and S5
 * toScopeParent() (redirect to the page behind the scope).
 */
class InertiaScopeServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // S4: invalid targets fail loudly; valid ones are flashed and picked
        // up by ResolveInertiaScope on the next scoped response (S3).
        RedirectResponse::macro('withScopeTarget', function (string $target): RedirectResponse {
            if (! in_array($target, ScopeHeaders::TARGETS, true)) {
                throw new InvalidArgumentException(
                    sprintf('Invalid scope target "%s", expected one of: %s.', $target, implode(', ', ScopeHeaders::TARGETS))
                );
            }

            /** @var RedirectResponse $this */
            return $this->with(ScopeHeaders::SESSION_KEY, $target);
        });

        // S5: back to whatever opened the scope — the parent URL when the
        // request carries one, plain back() otherwise.
        Redirector::macro('toScopeParent', function (): RedirectResponse {
            /** @var Redirector $this */
            $parentUrl = request()->header(ScopeHeaders::PARENT_URL);

            return $parentUrl ? $this->to($parentUrl) : $this->back();
        });
    }
}
