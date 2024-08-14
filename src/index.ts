/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

interface Comment {
	id?: number;
	date?: string;
	page: string;
	user: string;
	text: string;
	email?: string;
}

export interface Env {
	DB: D1Database;
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const { pathname } = new URL(request.url);
		let page = pathname.slice(1).replace(/\/$/, "");

		var response: Response;

		if (request.method === "POST") {
			if (request.headers.get("Content-Type") === "application/json") {
				let comment = <Comment>(await request.json());

				if (!comment.page || !comment.user || !comment.text) {
					response = new Response("Missing required fields", { status: 400 });
				}

				let results = await post(comment, env);
				response = Response.json(results, { status: 201 });

			} else {
				response = new Response("Expected JSON", { status: 400 });
			}
		} else if (request.method === "GET") {
			if (page != "") {
				let results = await list(page, env);
				response = Response.json(results, { status: 200 });
			} else {
				response = new Response("Bad request", { status: 400 });
			}
		} else if (request.method === "OPTIONS") {
			response = new Response(null, {
				status: 204,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET, POST",
					"Access-Control-Allow-Headers": "Content-Type",
				},
			});
		} else {
			response = new Response("Method not allowed", { status: 405 });
		}

		response.headers.set("Access-Control-Allow-Origin", "*");
		response.headers.set("Access-Control-Allow-Methods", "GET, POST");
		response.headers.set("Access-Control-Allow-Headers", "Content-Type");
		return response;
	},
} satisfies ExportedHandler<Env>;

async function list(page: string, env: Env) {
	const { results } = await env.DB.prepare(
		"SELECT id, date, page, user, text FROM comments WHERE page = ?"
	)
		.bind(page)
		.all();

	return results;
}

async function post(comment: Comment, env: Env) {
	let now = new Date(new Date().toLocaleString(undefined, { timeZone: "Asia/Shanghai" }));
	comment.date = now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate()
		+ " " + now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds();

	const { results } = await env.DB.prepare(
		"INSERT INTO comments (date, page, user, text, email) VALUES (?, ?, ?, ?, ?)"
	)
		.bind(comment.date, comment.page, comment.user, comment.text, comment.email)
		.run();
	return results;
}
