################
# @FlyerKiller #
################
f_ids = [242108]
f_ids.each do |f_id|
  f = Flyer.find(f_id)
  s = Sessions::Flyer::TileGeneration.where(:flyer_id => f.id).last
  s.state = 6; s.save!; f.state = 3; f.save!
end

#############
# @FlyerRun #
#############
fids = [32431,32063]
fids.each do |fid|
  fr = FlyerRun.find(fid)
  fr.flyers.each do |f|
    ContentAggregation::Gatherer.new(fr.merchant,f.page_items).start
  end
end

#######################
# @Codesheetgenerator #
#######################
"
prod: bundle exec script/code_sheets/homedepot_canada_codesheet_generator.rb '/FW28'
gw2: scp dzhang@proc4.fadmin.wishabi.net:/tmp/2cdc0e24-2942-11e4-9014-12313d3006ab/home_depot.code_sheet.csv ~/
local: scp dzhang@gw2:~/home_depot.code_sheet.csv ~/Desktop
"

#################
# @FileReloader #
#################
load "#{Rails.root}/lib/content_aggregation/jsparsers/staples_canada.rb"
load "#{Rails.root}/lib/code_sheets/pre_processors/staples_usa.rb"
load "#{Rails.root}/lib/code_sheets/parsers/staples_usa.rb"
load "#{Rails.root}/lib/code_sheets/pre_processors/staples_usa_stores.rb"
load "#{Rails.root}/lib/code_sheets/parsers/staples_usa_stores.rb"

def load_codesheet( name )
  load "#{Rails.root}/lib/code_sheets/pre_processors/#{name}.rb"
  load "#{Rails.root}/lib/code_sheets/parsers/#{name}.rb"
  load "#{Rails.root}/lib/code_sheets/pre_processors/#{name}_stores.rb"
  load "#{Rails.root}/lib/code_sheets/parsers/#{name}_stores.rb"
end

################
# @fudgeflyers #
################
m = Merchant.find_by_name_identifier "safewaycanada"
m.flyers.each {|fr| fr.available_to = 40.days.from_now; fr.save! }
m.flyer_runs.each {|fr| fr.available_to = 40.days.from_now; fr.save! }

###############
# @datapiping #
###############
fr = FlyerRun.find 29763
fr.pages.each do |p|
  ContentAggregation::Gatherer.new(fr.merchant,p.page_items).start
end

fr.pages.each { |p| p.page_items.each { |pi| puts "#{pi.name} + #{pi.id}" if pi.name =~ /Nike/i } } ; nil
fr.pages.each { |p| p.page_items.each { |pi| puts "#{pi.id}" if pi.supplemental_info.blank? && pi.url.present? } } ; nil
pis = []; pi_id.each {|piid| pis << PageItem.find piid }



p_id = [712752]
p_id.each do |id|
  p = Page.find(id)
  s = Sessions::Page::PageTileGeneration.where(:page_id => p.id).last
  s.state = 6; s.save!; p.state = 3; p.save!
end

MerchantApi::HomeDepotCanada.new.product("TBC", :language => "EN")



fr = FlyerRun.find 30203
su = SubItemImport::HomeDepotCanada.process('test.csv',fr); nil



rake db:migrate:down VERSION=20100905201547

cs = FlyerRunCodeSheet.find(3186)


CodeSheets::Normalizer.new(cs, :report_only => true).start

# you can also run it this way, you can run any one of these once the previous one has been run
# useful to test only your p
cs.fetch # need to run this first
cs.pre_process # need to run this second
cs.process # need to run this last











bundle exec script/code_sheets/homedepot_canada_codesheet_generator.rb '/FW29'
scp dzhang@proc4.fadmin.wishabi.net:filepath .


fr = FlyerRun.find 30923
fr.flyers.each do |f|
  puts f.description
  puts f.fsas
  puts
end


m = Merchant.find 2295
ContentAggregation::Gatherer.new(m, pi, :logger => Logger.new(STDOUT)).start


uri = URI("http://www.radioshack.com/product/index.jsp?productId=30070196")
html = Net::HTTP.get(uri)
doc = Nokogiri::HTML(html)
p = XML::Parser.string(html)
content = p.parse

data = doc.at_xpath(".//div[@id='prodImg']/div[@id='SP_ProductImage']/a[@class='photo']/img/@src", get_xpath_methods)

# noko

m.store_sets.each do |ss|
  ss.destroy if ss.store_count == 0
end


fr = FlyerRun.find(ID)
top = 636
bottom = 0
left = 1
right = 756
fr.pages.each { |p| p.trimbox_bottom = bottom; p.trimbox_top = top; p.trimbox_left = left; p.trimbox_right = right; puts "#{p.trimbox_bottom} #{p.trimbox_top} #{p.trimbox_left} #{p.trimbox_right}" };nil


ft_ids = [1588,1867,1868,1869]
ft_ids.each do |id|
  ft = FlyerType.find id
  if ft.flyer_runs.count == 0
    ft.mark_as_deleted
  else
    puts id
  end
end
ft = FlyerType

f_ids = [237935, 237936]
f_ids.each do |id|
  f = Flyer.find id
  f.mark_as_deleted
end



p_ids = [10365603, 10365604, 10366102, 10365605, 10366332, 10365606]
p_ids.each do |id|
  puts "DOING ID #{id}"
  pi = PageItem.find id
  if pi.supplemental_info.blank?
    pi.supplemental_info = PageItem::SupplementalInfo.new(:page_item_id => id)
    pi.supplemental_info.name = "Life Brand Evening Primrose Oil 500 mg Softgels"
    pi.supplemental_info.sku = "057800839453"
    pi.supplemental_info.description = "Overview:
Evening Primrose oil is a natural source of gamma-linolenic acid (GLA), an important omega-6 fatty acid. Your body can make GLA from linoleic acid. For many people though, the conversion of linoleic acid to GLA can be affected by many factors such as nutrient deficiency and saturated fats or trans-fatty acids in the diet. Choosing to supplement like Life Brand 500 mg softgels is a convenient way to reduce your reliance on the creation of GLA from linoleic acid in your body.

Benefits:
A source of essential fatty acids for the maintenance of good health.
A source of omega-6 fatty acids for the maintenance of good health.
A source of linoleic acid for the maintenance of good health."
    pi.supplemental_info.origin_url = "http://www1.shoppersdrugmart.ca/en/health-and-pharmacy/vitamins-and-supplements/multivitamins/details/057800839453"
    pi.supplemental_info.image_source_url = "http://sizeify.sjc.io/http/com.amazonaws.s3.brain-assets/l400/lago!057800839453_E_C_Y.png?1409170210912"
    pi.supplemental_info.save!
  end

  puts "SETTING DESCRIPTION"
  pi.description = "Overview:
Evening Primrose oil is a natural source of gamma-linolenic acid (GLA), an important omega-6 fatty acid. Your body can make GLA from linoleic acid. For many people though, the conversion of linoleic acid to GLA can be affected by many factors such as nutrient deficiency and saturated fats or trans-fatty acids in the diet. Choosing to supplement like Life Brand 500 mg softgels is a convenient way to reduce your reliance on the creation of GLA from linoleic acid in your body.

Benefits:
A source of essential fatty acids for the maintenance of good health.
A source of omega-6 fatty acids for the maintenance of good health.
A source of linoleic acid for the maintenance of good health."

  puts "SETTING FEATURES"
  if pi.features.blank?
    feature = PageItem::Feature.new()
    feature.feature_text = "Keep out of reach of children. Consult a physician if you are taking blood thinners or anti-psychotic medication. Consult a physician if you are pregnant or breastfeeding."
    pi.features << feature
    pi.features.first.save!
  end


  puts "SETTING SPECS"
  if pi.specs.blank?
    spec_1 = PageItem::Spec.new()
    spec_1.name = "Active Ingredients"
    spec_1.value = "Evening Primrose Oil (Oenothera biennis) (seed) 500 mg"
    spec_2 = PageItem::Spec.new()
    spec_2.name = "Non-Medicinal Ingredients"
    spec_2.value = "Softgel Capsule (Gelatin - bovine source, Glycerin, Purified Water), Vitamin E"
    pi.specs << spec_1
    spec_1.save
    pi.specs << spec_2
    spec_2.save
  end

  puts "SETTING SHIPPING INFO"
  if pi.shipping_info.blank?
    info = PageItem::ShippingInfo.new(:page_item_id => id)
    info.info_string = "(Adults): Take 1 softgel, 4 – 6 times daily or as directed by a health care practitioner."
    pi.shipping_info << info
    info.save!
  end

  puts "SAVING IT NOW"
  pi.data_piped = true
  pi.save!
end








publishers = ["caflipp","usflipp",]
publishers.each do |p_nid|
  p = Publisher.find_by_name_identifier p_nid
  p.layout_name = "flipp"
  p.mobile_theme_name = "flipp"
  p.button_primary_colour = "#00A5E1"
  p.button_hover_colour = "#00A5E1"
  p.button_link_colour = "#ffffff"
  p.header_menu_font_colour = "#00A5E1"
  p.header_menu_selected_font_colour = "#00A5E1"
  p.header_menu_dropdown_item_hover_bg_colour = "#DDDDDD"
  p.header_menu_dropdown_item_hover_font_colour = "#000000"
  p.header_menu_hover_font_colour = "#00A5E1"
  p.header_menu_hover_bg_colour = "#DDDDDD"
  # p.mobile_theme.layout_name = "flipp"
  # p.mobile_theme.button_bg_color = "#0584AC"
  p.save!
end