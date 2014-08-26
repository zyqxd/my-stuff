################
# @FlyerKiller #
################
f_ids = [239966]
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
load "#{Rails.root}/lib/code_sheets/parsers/shoppers_drug_mart_stores.rb"
load "#{Rails.root}/lib/code_sheets/pre_processors/shoppers_drug_mart_stores.rb"
load "#{Rails.root}/lib/code_sheets/processors/base.rb"
load "#{Rails.root}/lib/content_aggregation/jsparsers/staples_canada.rb"


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










