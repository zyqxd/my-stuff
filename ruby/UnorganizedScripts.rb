
s.each { |si|
  if si.delayed_job.present?
    si.delayed_job.priority = 0
    si.delayed_job.save!
  end
}

fr.pages.each { |p| p.page_items.each { |pi| puts "#{pi.name} + #{pi.id}" if pi.name =~ /Nike/i } } ; nil
fr.pages.each { |p| p.page_items.each { |pi| puts "#{pi.id}" if pi.supplemental_info.blank? && pi.url.present? } } ; nil
pis = []; pi_id.each {|piid| pis << PageItem.find piid }



pid = [735350]
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


fr_id = 33402
fr = FlyerRun.find(fr_id)
fr.pages.each { |p| p.page_items.each { |pi| if pi.external_override_image_source_url.present?; puts pi.id; url = pi.external_override_image_source_url; pi.external_override_image_source_url = nil; pi.save!; pi.external_override_image_source_url = url; pi.save!; puts pi.external_override_image_source_url; end } } ; nil
fr.pages.each { |p| p.page_items.each { |pi| if pi.external_override_image_source_url.present?; puts pi.id; pi.push_to_flyers; end } } ; nil


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



pi_s = []
fr.pages.each { |p|
  p.page_items.each { |pi|
    pi_s << pi.name if pi.url.present? && pi.external_image_source_url.blank? && pi.display_type == PageItem::DisplayTypes::ITEM
  }
} ; nil
pis = []
pi_s.each { |pi| pis << PageItem.find(pi) }
ContentAggregation::Gatherer.new(fr.merchant, pis).start



frs = [FlyerRun.find(34927), FlyerRun.find(34930)]
#cancel
(0..2).each do |i|
  fsa = []
  fsa.concat frs[0].flyers[i].fsas.split(" ") if frs[0].flyers[i].fsas.present?
  fsa.concat frs[1].flyers[i].fsas.split(" ") if frs[1].flyers[i].fsas.present?

  frs[0].flyers[i].fsas = fsa.join(" ");
  frs[1].flyers[i].fsas = fsa.join(" ");
  frs[0].flyers[i].save!
  frs[1].flyers[i].save!
  puts "lol #{fsa.count} #{fsa.count}"
end
frs = [FlyerRun.find(34927), FlyerRun.find(34930)]
(0..2).each do |i|
  fsa = []
  fsa.concat frs[0].flyers[i].fsas.split(" ") if frs[0].flyers[i].fsas.present?
  fsa.concat frs[1].flyers[i].fsas.split(" ") if frs[1].flyers[i].fsas.present?

  fsas = fsa.uniq.in_groups(2).to_a;
  frs[0].flyers[i].fsas = fsas[0].join(" ");
  frs[1].flyers[i].fsas = fsas[1].join(" ");
  frs[0].flyers[i].save!
  frs[1].flyers[i].save!
  puts "lol #{fsas[0].count} #{fsas[1].count}"
end
; nil










fr_new = FlyerRun.find(34228)
fr_old = FlyerRun.find(31109)
# delete all stores_flyers for new fr
fr_new.flyers.each { |f|
  next if f.stores_flyers.count <= 1
  f.stores_flyers.each(&:mark_as_deleted)
}
fr_old.flyers.each { |f|
  next if f.stores_flyers.count <= 1
  f_new = fr_new.flyers.where(:description => f.description).first
  next if f_new.blank?

  count = f.stores.count
  old_flyer_stores = f.stores_flyers.all
  while(old_flyer_stores.count > count/2)
    osf = old_flyer_stores.sample
    old_flyer_stores.delete(osf)
    puts osf.store_id
    nsf = StoresFlyer.where(:flyer_id => f_new.id, :store_id => osf.store_id).first
    if nsf.blank?
      nsf = StoresFlyer.create!(:flyer_id => f_new.id, :store_id => osf.store_id)
    end
    nsf.deleted = false
    nsf.save!
    osf.mark_as_deleted
  end
}

f_old = Flyer.find 247253
f_new = Flyer.find 252274

old_flyer_stores=f_old.stores_flyers.all
old_flyer_stores.each { |s|
  nsf = StoresFlyer.create(:flyer_id => f_new.id, :store_id => s.store_id)
  nsf.save!
}




stores = []
dups = []
fr1 = FlyerRun.find(34228)
fr2 = FlyerRun.find(31109)
fr1.flyers.each {|f|
  f.stores.each {|s|
    stores << s.merchant_store_code
  }
}
fr2.flyers.each{ |f|
  f.stores.each {|s|
    if stores.include? s.merchant_store_code
      dups << s.merchant_store_code
    end
  }
}

hash = {}
CSV.foreach( "lol.csv" ) do |inline|
  hash[inline[1]] ||= []
  hash[inline[1]] << inline[0] unless inline[0].blank? || inline[0] =~ /\D+/
end


# regex comparison
wtf = []
wtf2 = []
fr = FlyerRun.find 34893
m = fr.merchant
hash.each_pair do |key, value|
  f = fr.flyers.select{ |f| f.description == key }.first
  if f.blank?
    wtf << key
    next
  end

  value.each do |code|
    store = m.stores.select{ |s| s.merchant_store_code == code }.first
    if store.blank?
      # create the store
      wtf2 << code
      next
    end
    f.stores << store
  end

  f.save!
end


items =
mpcfilename = "/mnt/production/2731db14-4267-11e4-aa38-22000ab98c3a/image.mpc"
items.each do |item|
  begin
    puts item
    if item.generate_cutout_images( mpcfilename )
      count += 1
      item.touch
    end
  rescue Exception => e
    puts "Page: Cutout Generation failed for " +
                   "PageItem(#{item.id}): #{e.message}"
  end
end