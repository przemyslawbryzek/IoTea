-- Tea categories
INSERT OR IGNORE INTO tea_category (id, name) VALUES 
(1, 'Green Tea'),
(2, 'Black Tea'),
(3, 'Oolong'),
(4, 'White Tea'),
(5, 'Herbal');

-- Brewing styles
INSERT OR IGNORE INTO brewing_style (id, name, description) VALUES 
(1, 'Western', 'Short steep, cold water'),
(2, 'Gongfu', 'Multiple short infusions, hot water'),
(3, 'Traditional', 'Standard brewing method');

-- Teas
INSERT OR IGNORE INTO tea (id, name, description, category_id, brew_temp) VALUES 
(1, 'Sencha', 'Japanese green tea with vegetal notes', 1, 75),
(2, 'Dragon Well', 'Chinese green tea from Hangzhou with chestnut sweetness', 1, 80),
(3, 'Assam', 'Indian black tea with malty, bold flavor', 2, 95),
(4, 'Darjeeling', 'Indian black tea with fruity, floral notes', 2, 90),
(5, 'Tie Guan Yin', 'Oolong with complex orchid and fruity profile', 3, 85),
(6, 'White Peony', 'Delicate white tea with natural sweetness', 4, 70),
(7, 'Chamomile', 'Herbal blend with calming properties', 5, 95);

-- Brewing instructions
INSERT OR IGNORE INTO brewing_instructions (id, tea_id, style_id, grams_per_100ml, first_infusion_seconds, increment_seconds, max_infusions) VALUES 
-- Sencha
(1, 1, 1, 3.0, 45, 0, 1),
(2, 1, 2, 2.5, 30, 10, 5),
-- Dragon Well
(3, 2, 1, 3.0, 50, 0, 1),
(4, 2, 2, 2.5, 35, 10, 4),
-- Assam
(5, 3, 1, 3.5, 180, 0, 1),
(6, 3, 2, 3.0, 45, 15, 5),
-- Darjeeling
(7, 4, 1, 3.0, 150, 0, 1),
(8, 4, 2, 2.5, 40, 10, 6),
-- Tie Guan Yin
(9, 5, 2, 3.5, 30, 10, 8),
(10, 5, 3, 3.5, 60, 15, 5),
-- White Peony
(11, 6, 1, 3.0, 60, 0, 1),
(12, 6, 2, 2.5, 35, 10, 4),
-- Chamomile
(13, 7, 1, 4.0, 300, 0, 1),
(14, 7, 3, 4.0, 300, 0, 1);
