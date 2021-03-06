/*
 * Copyright (C) 2015       Ben Ockmore
 *               2015-2016  Sean Burke
 *               2015       Leo Verto
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */

'use strict';

const express = require('express');
const router = express.Router();
const Promise = require('bluebird');
const React = require('react');
const ReactDOMServer = require('react-dom/server');

const utils = require('../helpers/utils');

const _ = require('lodash');

const Layout = require('../../client/components/layout');
const Index = require('../../client/components/pages/index');

const AboutPage = React.createFactory(
	require('../../client/components/pages/about')
);
const ContributePage = React.createFactory(
	require('../../client/components/pages/contribute')
);
const DevelopPage = React.createFactory(
	require('../../client/components/pages/develop')
);
const PrivacyPage = React.createFactory(
	require('../../client/components/pages/privacy')
);
const LicensingPage = React.createFactory(
	require('../../client/components/pages/licensing')
);

/* GET home page. */
router.get('/', (req, res, next) => {
	const numRevisionsOnHomepage = 9;

	function render(entities) {
		const props = Object.assign({}, req.app.locals, res.locals, {
			recent: _.take(entities, numRevisionsOnHomepage),
			homepage: true
		});

		// Renders react components server side and injects markup into target
		// file
		// object spread injects the app.locals variables into React as props
		res.render('target', {
			markup: ReactDOMServer.renderToString(
				<Layout {...props}>
					<Index />
				</Layout>
			)
		});
	}

	const entityModels = utils.getEntityModels();

	const latestEntitiesPromise =
		Promise.all(_.map(entityModels, (model, name) =>
			model.query((qb) => {
				qb
					.leftJoin(
						'bookbrainz.revision',
						`bookbrainz.${_.snakeCase(name)}.revision_id`,
						'bookbrainz.revision.id'
					)
					.where('master', true)
					.orderBy('bookbrainz.revision.created_at', 'desc')
					.limit(numRevisionsOnHomepage);
			})
			.fetchAll({
				withRelated: ['defaultAlias', 'revision.revision']
			})
			.then((collection) => collection.toJSON())
		));

	latestEntitiesPromise
		.then((latestEntitiesByType) => {
			const latestEntities = _.orderBy(
				_.flatten(latestEntitiesByType), 'revision.revision.createdAt',
				['desc']
			);
			render(latestEntities);
		})
		.catch(next);
});

// Helper function to create pages that don't require custom logic
function _createStaticRoute(route, title, pageComponent) {
	router.get(route, (req, res) => {
		res.render('page', {
			title,
			homepage: false,
			markup: ReactDOMServer.renderToString(pageComponent())
		});
	});
}

_createStaticRoute('/about', 'About', AboutPage);
_createStaticRoute('/contribute', 'Contribute', ContributePage);
_createStaticRoute('/develop', 'Develop', DevelopPage);
_createStaticRoute('/licensing', 'Licensing', LicensingPage);
_createStaticRoute('/privacy', 'Privacy', PrivacyPage);

module.exports = router;
