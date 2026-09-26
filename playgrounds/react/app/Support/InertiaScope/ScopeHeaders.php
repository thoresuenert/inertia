<?php

namespace App\Support\InertiaScope;

/**
 * Header names and keys of the Router Scopes protocol (docs/04-protocol.md).
 */
final class ScopeHeaders
{
    public const SCOPE = 'X-Inertia-Scope';

    public const SCOPE_URL = 'X-Inertia-Scope-Url';

    public const PARENT_URL = 'X-Inertia-Scope-Parent-Url';

    public const TARGET = 'X-Inertia-Scope-Target';

    public const SESSION_KEY = '_inertia_scope_target';

    public const ATTRIBUTE = 'inertia_scope_target';

    public const TARGETS = ['self', 'parent', 'root'];
}
