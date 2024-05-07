<script lang="ts">
    // import 'https://apis.google.com/js/api.js';
    import { onMount } from 'svelte';    
    import { createAuth, token, error, type AuthResult } from '../service/auth.service';

    let auth: AuthResult;
    let loading = false;
    let content = '';

    onMount(async () => {
        gapi.load('client', initClient);
    });

    async function initClient() {
        auth = await createAuth(loadToken());
        await gapi.client.init(auth.config);

        token.subscribe(res => {
            if (res) {
                sessionStorage.setItem('token', JSON.stringify(res));
            } 
        });
    }

    function loadToken() {
        const token = sessionStorage.getItem('token');
        return token ? JSON.parse(token) : null;
    }

    async function listFiles() {
        const result = await withToken(async access_token => await gapi.client.drive.files.list({
            access_token,
            pageSize: 20,
            fields: 'files(id, name)',
            q: "name contains '####-##.txt'"
        }));
        return result?.files?.sort((a, b) => a.name!.localeCompare(b.name!)) ?? [];
    }

    async function loadFile(fileId?: string) {
        if (fileId) {
            const result = await withToken(async access_token => await gapi.client.drive.files.get({
                access_token,
                fileId,
                alt: 'media',
            }));
            content = JSON.stringify(result, null, 2);
        }
    }

    async function withToken<T>(fn: (token: string) => Promise<gapi.client.Response<T>>): Promise<T | null> {
        if ($token?.access_token) {
            try {
                loading = true;
                const response = await fn($token.access_token);
                return response.result;
            } catch (err: any) {
                if (err?.result?.error?.code === 401) {
                    sessionStorage.removeItem('token');
                    auth.signOut();
                } else {
                    error.set(err?.result?.error?.message ?? err);
                }
            } finally {
                loading = false;
            }
        }
        return null;
    }
</script>

<svelte:head>
	<title>Red Notebook - Web Client</title>
	<meta name="description" content="Web Client for Red Notebook" />
</svelte:head>

<h1>Red Notebook</h1>

<button on:click={() => auth.signIn()}>{$token ? 'Refresh' : 'Authorize'}</button>
{#if loading}
    <div class="spinner">Loading...</div>
{/if}
{#if auth && $token}
    <button on:click={() => auth.signOut()}>Sign out</button>
    {#await listFiles()}
        loading...
    {:then files} 
    <main>
        <ul>
            {#each files as file, $index}
                <li>
                    <button tabindex="{$index}" on:click={() => loadFile(file.id)}>
                        {file.name}
                    </button>
                </li>
            {/each}
        </ul>
        <pre class="content">
            {content}
        </pre>
    </main>
    {/await}
{/if}

{#if $error}
    <pre class="error">{JSON.stringify($error, null, 2)}</pre>
{/if}

<style>
    :root {
        font-family: Arial, Helvetica, sans-serif;
    }

    main {
        display: flex;
        gap: 1rem;
    }

    ul {
        list-style-type: none;
    }

    .content {
        border: 1px solid gray;
        flex-grow: 1;
    }

    .spinner {
        padding: 1rem;
        position: absolute;
        left: 0;
        right: 0;
        bottom: 50%;
        font-style: italic;
        text-align: center;
        background-color: #f0f0f080;
    }

    .error {
        padding: 1rem;
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        color: red;
    }
</style>