<?php

namespace App\Support\InertiaScope;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware for scoped Inertia requests. Implements S1 (no-op without the
 * scope header), S2 (Referer := scope URL, so back() and validation redirects
 * return to the scope) and S3 (emit a flashed/attribute target once).
 */
class ResolveInertiaScope
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->hasHeader(ScopeHeaders::SCOPE)) {
            return $next($request); // S1
        }

        // S2: Laravel's back() checks the Referer header first, so this one
        // line routes back() and failed validations to the scope URL.
        if ($scopeUrl = $request->header(ScopeHeaders::SCOPE_URL)) {
            $request->headers->set('referer', $scopeUrl);
        }

        // S3, part 1: pull the flash BEFORE handling. A target flashed by
        // withScopeTarget() during THIS request must survive for the next
        // scoped response — headers on the redirect itself get lost.
        $flashed = $request->hasSession() ? $request->session()->pull(ScopeHeaders::SESSION_KEY) : null;

        $response = $next($request);

        // S3, part 2: the request attribute is set during handling, so it is
        // read after — and wins over a flashed value.
        $target = $request->attributes->get(ScopeHeaders::ATTRIBUTE) ?? $flashed;

        if ($target !== null) {
            $response->headers->set(ScopeHeaders::TARGET, $target);
        }

        return $response;
    }
}
