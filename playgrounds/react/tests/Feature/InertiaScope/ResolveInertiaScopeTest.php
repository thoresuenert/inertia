<?php

namespace Tests\Feature\InertiaScope;

use App\Support\InertiaScope\ScopeHeaders;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Rules S1-S3: the ResolveInertiaScope middleware. Routes are throwaway,
 * defined per test run.
 */
class ResolveInertiaScopeTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Route::middleware('web')->group(function () {
            Route::get('/scope-test/back', fn () => back());
            Route::post('/scope-test/store', function () {
                request()->validate(['name' => 'required|min:3']);

                return redirect('/scope-test/done');
            });
            Route::get('/scope-test/page', fn () => response('ok'));
        });
    }

    protected function scopedHeaders(array $extra = []): array
    {
        return array_merge([
            ScopeHeaders::SCOPE => 'test-modal',
            ScopeHeaders::SCOPE_URL => 'http://localhost/scopes/users?page=2',
            ScopeHeaders::PARENT_URL => 'http://localhost/dashboard',
        ], $extra);
    }

    public function test_s1_without_scope_header_nothing_changes(): void
    {
        $response = $this
            ->withSession([ScopeHeaders::SESSION_KEY => 'self'])
            ->withHeaders(['referer' => 'http://localhost/somewhere'])
            ->get('/scope-test/back');

        $response->assertRedirect('http://localhost/somewhere');
        $response->assertHeaderMissing(ScopeHeaders::TARGET);
        // The flashed key is not consumed by non-scoped requests.
        $this->assertSame('self', session(ScopeHeaders::SESSION_KEY));
    }

    public function test_s2_back_redirects_to_the_scope_url(): void
    {
        $response = $this
            ->withHeaders($this->scopedHeaders(['referer' => 'http://localhost/dashboard']))
            ->get('/scope-test/back');

        $response->assertRedirect('http://localhost/scopes/users?page=2');
    }

    public function test_s2_failed_validation_in_a_scoped_post_redirects_to_the_scope_url(): void
    {
        $response = $this
            ->withHeaders($this->scopedHeaders())
            ->post('/scope-test/store', ['name' => 'x']);

        $response->assertRedirect('http://localhost/scopes/users?page=2');
        $response->assertSessionHasErrors('name');
    }

    public function test_s3_with_scope_target_sets_the_header_on_the_next_scoped_response_once(): void
    {
        $first = $this
            ->withSession([ScopeHeaders::SESSION_KEY => 'self'])
            ->withHeaders($this->scopedHeaders())
            ->get('/scope-test/page');

        $first->assertHeader(ScopeHeaders::TARGET, 'self');

        // Consumed: the next scoped response carries no target.
        $second = $this->withHeaders($this->scopedHeaders())->get('/scope-test/page');

        $second->assertHeaderMissing(ScopeHeaders::TARGET);
    }

    public function test_s3_request_attribute_also_sets_the_header(): void
    {
        Route::middleware('web')->get('/scope-test/attribute', function () {
            request()->attributes->set(ScopeHeaders::ATTRIBUTE, 'parent');

            return response('ok');
        });

        $response = $this->withHeaders($this->scopedHeaders())->get('/scope-test/attribute');

        $response->assertHeader(ScopeHeaders::TARGET, 'parent');
    }
}
